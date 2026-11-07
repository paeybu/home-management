-- Fridge inventory: groceries in the fridge / freezer, with optional expiry dates.
-- `location` is a check-constrained text column so more places (e.g. 'pantry') can be added later
-- by replacing the constraint, with no data migration.
-- Items leave the inventory via removed_at + removed_reason (used up / thrown out), keeping history.

create table public.fridge_items (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  name           text not null,
  location       text not null default 'fridge'
                   constraint fridge_items_location_check check (location in ('fridge','freezer')),
  quantity       numeric(10,2) not null default 1 check (quantity >= 0),
  unit           text not null default 'pcs'
                   check (unit in ('pcs','pack','g','kg','ml','l')),
  added_on       date not null default current_date,
  expires_on     date,
  opened_on      date,
  notes          text,
  removed_at     timestamptz,
  removed_reason text check (removed_reason in ('used','discarded')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint fridge_items_removed_shape check ((removed_at is null) = (removed_reason is null))
);
create index on public.fridge_items (household_id, expires_on) where removed_at is null;
create trigger fridge_items_updated_at before update on public.fridge_items for each row execute function public.set_updated_at();

alter table public.fridge_items enable row level security;
create policy "members all fridge_items" on public.fridge_items
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
