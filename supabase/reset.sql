-- One-time reset for the simplified Double Chance schema.
-- This deletes application data but does not delete Supabase Auth users.
-- Run this in the Supabase SQL Editor as the database owner.

drop table if exists public.bet_selections cascade;
drop table if exists public.bets cascade;
drop table if exists public.rounds cascade;
drop table if exists public.weeks cascade;
drop table if exists public.matches cascade;
drop table if exists public.match_sync_runs cascade;
drop table if exists public.challenge_members cascade;
drop table if exists public.challenges cascade;
drop function if exists public.is_challenge_member(uuid);
drop function if exists public.is_challenge_owner(uuid);
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
  market text not null check (market in ('match_result', 'both_teams_score', 'total_goals')),
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

alter table public.weeks enable row level security;
alter table public.bets enable row level security;
alter table public.matches enable row level security;
alter table public.bet_selections enable row level security;
alter table public.match_sync_runs enable row level security;

create policy "authenticated users can manage weeks"
on public.weeks for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "authenticated users can manage bets"
on public.bets for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "authenticated users can manage selections"
on public.bet_selections for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "authenticated users can manage matches"
on public.matches for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "authenticated users can manage sync runs"
on public.match_sync_runs for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

alter publication supabase_realtime add table public.weeks, public.bets, public.bet_selections, public.matches;
