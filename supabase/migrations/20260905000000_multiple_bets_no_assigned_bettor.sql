-- Weeks no longer have a single "assigned bettor" — any signed-in player can
-- add their own bet(s) to a week, and a week can hold any number of bets.
drop policy if exists "admins or assigned bettors can update week status" on public.weeks;
create policy "admins can update week status"
on public.weeks for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.prevent_non_admin_week_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() and (
    new.week is distinct from old.week or
    new.title is distinct from old.title or
    new.stake is distinct from old.stake or
    new.deadline is distinct from old.deadline
  ) then
    raise exception 'Only admins can edit week details.';
  end if;
  return new;
end;
$$;

alter table public.weeks drop column bettor_id;
alter table public.bets drop constraint if exists bets_week_bettor_unique;
