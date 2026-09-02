-- The Weekly Punt application schema.
-- Supabase Auth remains the source of truth for users.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  week integer not null,
  title text not null,
  bettor_id uuid references auth.users not null,
  stake numeric(10,2) not null default 20,
  deadline timestamptz not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'settled'))
);

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references public.weeks on delete cascade not null,
  bettor_id uuid references auth.users not null,
  bet_type text not null,
  stake numeric(10,2) not null,
  combined_odds numeric(8,2) not null,
  status text not null default 'pending',
  actual_return numeric(10,2),
  created_at timestamptz not null default now(),
  constraint bets_week_bettor_unique unique (week_id, bettor_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_match_id text not null,
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  status text not null,
  minute text,
  starts_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider, provider_match_id)
);

create table public.bet_selections (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid references public.bets on delete cascade not null,
  match_id uuid references public.matches not null,
  market text not null check (
    market in (
      'match_result',
      'double_chance',
      'both_teams_score',
      'total_goals',
      'first_team_to_score',
      'draw_no_bet',
      'win_to_nil',
      'correct_score'
    )
  ),
  pick text not null,
  odds numeric(8,2) not null,
  status text not null default 'pending'
);

create table public.match_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  error text
);

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

create trigger prevent_non_admin_week_edits
  before update on public.weeks
  for each row execute procedure public.prevent_non_admin_week_edits();

alter table public.profiles enable row level security;
alter table public.weeks enable row level security;
alter table public.bets enable row level security;
alter table public.matches enable row level security;
alter table public.bet_selections enable row level security;
alter table public.match_sync_runs enable row level security;

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

alter publication supabase_realtime add table public.weeks, public.bets, public.bet_selections, public.matches;
