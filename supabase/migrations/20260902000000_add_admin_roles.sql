-- Add server-controlled player profiles and admin roles.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1), 'Player')
from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Player')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.prevent_non_admin_week_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() and (
    new.week is distinct from old.week or
    new.title is distinct from old.title or
    new.bettor_id is distinct from old.bettor_id or
    new.stake is distinct from old.stake or
    new.deadline is distinct from old.deadline
  ) then
    raise exception 'Only admins can edit week details.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_non_admin_week_edits on public.weeks;
create trigger prevent_non_admin_week_edits
  before update on public.weeks
  for each row execute procedure public.prevent_non_admin_week_edits();

alter table public.profiles enable row level security;

drop policy if exists "authenticated users can manage weeks" on public.weeks;
drop policy if exists "authenticated users can manage bets" on public.bets;
drop policy if exists "authenticated users can manage selections" on public.bet_selections;
drop policy if exists "authenticated users can manage matches" on public.matches;
drop policy if exists "authenticated users can manage sync runs" on public.match_sync_runs;

create policy "authenticated users can view profiles"
on public.profiles for select to authenticated
using (auth.uid() is not null);

create policy "authenticated users can view weeks"
on public.weeks for select to authenticated
using (auth.uid() is not null);

create policy "admins can create weeks"
on public.weeks for insert to authenticated
with check (public.is_admin());

create policy "admins or assigned bettors can update week status"
on public.weeks for update to authenticated
using (public.is_admin() or bettor_id = auth.uid())
with check (public.is_admin() or bettor_id = auth.uid());

create policy "admins can delete weeks"
on public.weeks for delete to authenticated
using (public.is_admin());

create policy "authenticated users can view bets"
on public.bets for select to authenticated
using (auth.uid() is not null);

create policy "bettors or admins can create bets"
on public.bets for insert to authenticated
with check (public.is_admin() or bettor_id = auth.uid());

create policy "bettors or admins can update bets"
on public.bets for update to authenticated
using (public.is_admin() or bettor_id = auth.uid())
with check (public.is_admin() or bettor_id = auth.uid());

create policy "bettors or admins can delete bets"
on public.bets for delete to authenticated
using (public.is_admin() or bettor_id = auth.uid());

create policy "authenticated users can view selections"
on public.bet_selections for select to authenticated
using (auth.uid() is not null);

create policy "bettors or admins can create selections"
on public.bet_selections for insert to authenticated
with check (
  public.is_admin() or exists (
    select 1 from public.bets
    where bets.id = bet_id and bets.bettor_id = auth.uid()
  )
);

create policy "bettors or admins can update selections"
on public.bet_selections for update to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.bets
    where bets.id = bet_id and bets.bettor_id = auth.uid()
  )
)
with check (
  public.is_admin() or exists (
    select 1 from public.bets
    where bets.id = bet_id and bets.bettor_id = auth.uid()
  )
);

create policy "bettors or admins can delete selections"
on public.bet_selections for delete to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.bets
    where bets.id = bet_id and bets.bettor_id = auth.uid()
  )
);

create policy "authenticated users can view matches"
on public.matches for select to authenticated
using (auth.uid() is not null);

create policy "authenticated users can save matches"
on public.matches for insert to authenticated
with check (auth.uid() is not null);

create policy "authenticated users can update matches"
on public.matches for update to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "admins can view sync runs"
on public.match_sync_runs for select to authenticated
using (public.is_admin());
