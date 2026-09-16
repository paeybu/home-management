-- Bootstrap the first household and its allowlist. Membership rows are created on first sign-in
-- by the app (auth callback) for any email present in allowed_emails.
with h as (
  insert into public.households (name) values ('Home') returning id
)
insert into public.allowed_emails (email, household_id)
select 'vachirarat@atiom.app', id from h;
