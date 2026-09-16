-- Home Management v1 schema
-- Every table carries household_id so members can be added later without migration.

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner','member')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.allowed_emails (
  email        text primary key check (email = lower(email)),
  household_id uuid not null references public.households(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  icon         text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  unique (household_id, name)
);

create table public.assets (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  name           text not null,
  category_id    uuid references public.categories(id) on delete set null,
  brand          text,
  model          text,
  serial         text,
  purchased_at   date,
  warranty_until date,
  notes          text,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references public.households(id) on delete cascade,
  title              text not null,
  category_id        uuid references public.categories(id) on delete set null,
  asset_id           uuid references public.assets(id) on delete set null,
  notes              text,
  schedule_type      text not null check (schedule_type in ('rolling','fixed','once')),
  interval_value     int  check (interval_value > 0),
  interval_unit      text check (interval_unit in ('day','week','month','year')),
  fixed_day_of_month int  check (fixed_day_of_month between 1 and 31),
  fixed_month        int  check (fixed_month between 1 and 12),
  start_date         date not null default current_date,
  estimated_cost     numeric(12,2) check (estimated_cost >= 0),
  paused_at          timestamptz,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint tasks_schedule_shape check (
    (schedule_type = 'once'    and interval_value is null and interval_unit is null) or
    (schedule_type = 'rolling' and interval_value is not null and interval_unit is not null) or
    (schedule_type = 'fixed'   and interval_value is not null and interval_unit in ('month','year')
        and fixed_day_of_month is not null
        and (interval_unit = 'month' or fixed_month is not null))
  )
);

create table public.task_completions (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_by uuid references auth.users(id) on delete set null,
  cost         numeric(12,2) check (cost >= 0),
  notes        text,
  photo_path   text,
  created_at   timestamptz not null default now()
);

create table public.reminder_log (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  channel      text not null default 'line',
  sent_on      date not null,
  task_count   int not null default 0,
  payload      jsonb,
  created_at   timestamptz not null default now(),
  unique (household_id, channel, sent_on)
);

create index on public.household_members (user_id);
create index on public.categories (household_id);
create index on public.assets (household_id);
create index on public.tasks (household_id);
create index on public.tasks (asset_id);
create index on public.task_completions (task_id, completed_at desc);
create index on public.task_completions (household_id, completed_at desc);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger assets_updated_at before update on public.assets for each row execute function public.set_updated_at();
create trigger tasks_updated_at  before update on public.tasks  for each row execute function public.set_updated_at();

-- Membership helper (SECURITY INVOKER: relies on household_members RLS letting a user see their own rows)
create or replace function public.is_member(hid uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid())
  );
$$;

-- Next occurrence of a fixed calendar schedule strictly after p_after, stepping from p_anchor.
create or replace function public.next_fixed_due(
  p_after date, p_anchor date, p_unit text, p_value int, p_dom int, p_month int
) returns date
language plpgsql immutable set search_path = '' as $$
declare
  base date; cand date; i int := 0;
begin
  if p_unit = 'month' then
    base := date_trunc('month', p_anchor)::date;
  elsif p_unit = 'year' then
    base := make_date(extract(year from p_anchor)::int, coalesce(p_month, 1), 1);
  else
    return null;
  end if;
  loop
    -- clamp day to month length
    cand := least(base + (p_dom - 1), (base + interval '1 month' - interval '1 day')::date);
    exit when cand > p_after or i > 2000;
    base := case p_unit
      when 'month' then (base + make_interval(months => p_value))::date
      else (base + make_interval(years => p_value))::date end;
    i := i + 1;
  end loop;
  return cand;
end $$;

-- Due view. Excludes paused/archived tasks per plan.
create or replace view public.task_due with (security_invoker = true) as
with last as (
  select task_id, max(completed_at) as last_completed_at, count(*) as completion_count
  from public.task_completions group by task_id
),
calc as (
  select
    t.*,
    l.last_completed_at,
    coalesce(l.completion_count, 0) as completion_count,
    case t.schedule_type
      when 'once' then case when l.task_id is null then t.start_date else null end
      when 'rolling' then
        (coalesce((l.last_completed_at at time zone 'utc')::date, t.start_date)
          + (t.interval_value || ' ' || t.interval_unit)::interval)::date
      when 'fixed' then
        public.next_fixed_due(
          coalesce((l.last_completed_at at time zone 'utc')::date, t.start_date - 1),
          t.start_date, t.interval_unit, t.interval_value, t.fixed_day_of_month, t.fixed_month)
    end as due_on
  from public.tasks t
  left join last l on l.task_id = t.id
  where t.paused_at is null and t.archived_at is null
)
select
  c.*,
  case
    when c.due_on is null then 'done'
    when c.due_on < current_date then 'overdue'
    when c.due_on <= current_date + 7 then 'due_soon'
    else 'upcoming'
  end as status,
  (c.due_on - current_date) as days_until_due
from calc c;

-- RLS
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.allowed_emails    enable row level security;
alter table public.categories        enable row level security;
alter table public.assets            enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_completions  enable row level security;
alter table public.reminder_log      enable row level security;

create policy "members read own membership" on public.household_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy "members read household" on public.households
  for select to authenticated using (public.is_member(id));
create policy "owners update household" on public.households
  for update to authenticated
  using (exists (select 1 from public.household_members m where m.household_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists (select 1 from public.household_members m where m.household_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'));

create policy "members read allowlist" on public.allowed_emails
  for select to authenticated using (public.is_member(household_id));

create policy "members all categories" on public.categories
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members all assets" on public.assets
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members all tasks" on public.tasks
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members all completions" on public.task_completions
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members read reminder_log" on public.reminder_log
  for select to authenticated using (public.is_member(household_id));

-- Storage bucket for completion photos: path = {household_id}/{task_id}/{file}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('completions', 'completions', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "members read completion photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'completions' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "members upload completion photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'completions' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "members delete completion photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'completions' and public.is_member(((storage.foldername(name))[1])::uuid));

-- Default categories for a new household
create or replace function public.seed_household_categories() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.categories (household_id, name, icon, sort_order) values
    (new.id, 'Lawn',       '🌱', 1),
    (new.id, 'HVAC',       '❄️', 2),
    (new.id, 'Plumbing',   '🚿', 3),
    (new.id, 'Electrical', '⚡', 4),
    (new.id, 'Fees',       '🧾', 5),
    (new.id, 'Insurance',  '🛡️', 6),
    (new.id, 'Safety',     '🧯', 7),
    (new.id, 'Cleaning',   '🧽', 8),
    (new.id, 'Other',      '📦', 9);
  return new;
end $$;
create trigger households_seed_categories after insert on public.households
  for each row execute function public.seed_household_categories();
