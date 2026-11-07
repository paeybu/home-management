-- Menu suggestions: AI-generated Thai dishes that can be cooked from the current fridge/freezer contents.
-- Acts as a cache keyed on a hash of the inventory, so the model is only called again when the
-- fridge actually changes (or someone asks for new ideas). Suggestions never modify the inventory.

create table public.menu_suggestions (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  inventory_hash text not null,
  dishes         jsonb not null,
  model          text not null,
  created_at     timestamptz not null default now()
);
create index on public.menu_suggestions (household_id, inventory_hash, created_at desc);

alter table public.menu_suggestions enable row level security;
create policy "members all menu_suggestions" on public.menu_suggestions
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
