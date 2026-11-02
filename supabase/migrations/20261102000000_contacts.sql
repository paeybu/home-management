-- Contacts: people who do work for the household (gardener, AC tech, maid, plumber, family…).
-- Tasks can be assigned to a contact; completions record which contact actually did the job.

create table public.contacts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  company      text,
  role         text,                                     -- free text: "Gardener", "AC technician"
  category_id  uuid references public.categories(id) on delete set null,
  phone        text,
  email        text,
  line_id      text,
  notes        text,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.contacts (household_id, name);
create trigger contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;
create policy "members all contacts" on public.contacts
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

alter table public.tasks            add column contact_id uuid references public.contacts(id) on delete set null;
alter table public.task_completions add column contact_id uuid references public.contacts(id) on delete set null;
create index on public.tasks (contact_id);
create index on public.task_completions (contact_id, completed_at desc);

-- task_due selects t.*, so it must be recreated to pick up tasks.contact_id.
drop view public.task_due;
create view public.task_due with (security_invoker = true) as
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
