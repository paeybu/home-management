-- Food catalog: one row per distinct food a household has added. Learns as items are added and powers
-- (1) name autocomplete with sensible defaults in the add form and (2) the food -> emoji / 3D model mapping.

create table public.food_catalog (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households(id) on delete cascade,
  name             text not null,
  emoji            text,                    -- null = guess from name (lib/food-emoji.ts)
  model            text,                    -- 3D model key (public/models/food/<key>.glb); null = guess from name, 'none' = emoji only
  default_unit     text check (default_unit in ('pcs','pack','g','kg','ml','l')),
  default_location text,                    -- same values as fridge_items.location
  shelf_life_days  int check (shelf_life_days >= 0),
  use_count        int not null default 0,
  last_used_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index food_catalog_household_name on public.food_catalog (household_id, lower(name));
create trigger food_catalog_updated_at before update on public.food_catalog for each row execute function public.set_updated_at();

alter table public.food_catalog enable row level security;
create policy "members all food_catalog" on public.food_catalog
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

alter table public.fridge_items add column catalog_id uuid references public.food_catalog(id) on delete set null;
create index on public.fridge_items (catalog_id);

-- Backfill from items already added (emoji/model stay null = guessed from the name).
insert into public.food_catalog (household_id, name, default_unit, default_location, shelf_life_days, use_count, last_used_at)
select distinct on (household_id, lower(name))
  household_id, name, unit, location,
  case when expires_on is not null then greatest(expires_on - added_on, 0) end,
  count(*) over (partition by household_id, lower(name)),
  max(created_at) over (partition by household_id, lower(name))
from public.fridge_items
order by household_id, lower(name), created_at desc;

update public.fridge_items f set catalog_id = c.id
from public.food_catalog c
where c.household_id = f.household_id and lower(c.name) = lower(f.name);
