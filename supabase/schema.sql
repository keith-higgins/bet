create table challenges (id uuid primary key default gen_random_uuid(), name text not null, owner_id uuid references auth.users not null, currency text not null default 'EUR', created_at timestamptz not null default now());
create table challenge_members (challenge_id uuid references challenges on delete cascade, user_id uuid references auth.users on delete cascade, display_name text not null, role text not null check (role in ('owner','player')), primary key (challenge_id, user_id));
create table rounds (id uuid primary key default gen_random_uuid(), challenge_id uuid references challenges on delete cascade not null, week integer not null, title text not null, bettor_id uuid references auth.users not null, stake numeric(10,2) not null default 20, deadline timestamptz not null, status text not null default 'in_progress' check (status in ('in_progress','settled')));
create table bets (id uuid primary key default gen_random_uuid(), round_id uuid references rounds on delete cascade not null, bettor_id uuid references auth.users not null, bet_type text not null, stake numeric(10,2) not null, combined_odds numeric(8,2) not null, status text not null default 'pending', actual_return numeric(10,2), created_at timestamptz not null default now());
create table matches (id uuid primary key default gen_random_uuid(), provider text not null, provider_match_id text not null, home_team text not null, away_team text not null, home_score integer, away_score integer, status text not null, minute text, starts_at timestamptz, updated_at timestamptz not null default now(), unique(provider, provider_match_id));
create table bet_selections (id uuid primary key default gen_random_uuid(), bet_id uuid references bets on delete cascade not null, match_id uuid references matches not null, market text not null check (market in ('match_result','both_teams_score','total_goals')), pick text not null, odds numeric(8,2) not null, status text not null default 'pending');
create table match_sync_runs (id uuid primary key default gen_random_uuid(), provider text not null, started_at timestamptz not null default now(), finished_at timestamptz, status text not null, error text);

alter table challenges enable row level security;
alter table challenge_members enable row level security;
alter table rounds enable row level security;
alter table bets enable row level security;
alter table bet_selections enable row level security;
alter table matches enable row level security;
alter table match_sync_runs enable row level security;
create policy "members can read challenges" on challenges for select using (exists (select 1 from challenge_members where challenge_id = challenges.id and user_id = auth.uid()));
create policy "members can read challenge data" on rounds for select using (exists (select 1 from challenge_members where challenge_id = rounds.challenge_id and user_id = auth.uid()));
create policy "members can read bets" on bets for select using (exists (select 1 from rounds join challenge_members on challenge_members.challenge_id = rounds.challenge_id where rounds.id = bets.round_id and challenge_members.user_id = auth.uid()));
create policy "members can read selections" on bet_selections for select using (exists (select 1 from bets join rounds on rounds.id = bets.round_id join challenge_members on challenge_members.challenge_id = rounds.challenge_id where bets.id = bet_selections.bet_id and challenge_members.user_id = auth.uid()));

alter table bets add constraint bets_round_bettor_unique unique (round_id, bettor_id);
create policy "users can create challenges" on challenges for insert with check (owner_id = auth.uid());
create policy "owners can update challenges" on challenges for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners can delete challenges" on challenges for delete using (owner_id = auth.uid());
create or replace function public.is_challenge_owner(target_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.challenges where id = target_challenge_id and owner_id = auth.uid()); $$;
revoke all on function public.is_challenge_owner(uuid) from public;
grant execute on function public.is_challenge_owner(uuid) to authenticated;
create policy "members can read memberships" on challenge_members for select using (user_id = auth.uid() or public.is_challenge_owner(challenge_id));
create policy "owners can invite members" on challenge_members for insert with check (public.is_challenge_owner(challenge_id));
create policy "members can create rounds" on rounds for insert with check (exists (select 1 from challenge_members where challenge_members.challenge_id = rounds.challenge_id and challenge_members.user_id = auth.uid()));
create policy "members can update rounds" on rounds for update using (exists (select 1 from challenge_members where challenge_members.challenge_id = rounds.challenge_id and challenge_members.user_id = auth.uid()));
create policy "members can create bets" on bets for insert with check (exists (select 1 from rounds join challenge_members on challenge_members.challenge_id = rounds.challenge_id where rounds.id = bets.round_id and challenge_members.user_id = auth.uid()));
create policy "members can update bets" on bets for update using (exists (select 1 from rounds join challenge_members on challenge_members.challenge_id = rounds.challenge_id where rounds.id = bets.round_id and challenge_members.user_id = auth.uid()));
create policy "members can create selections" on bet_selections for insert with check (exists (select 1 from bets join rounds on rounds.id = bets.round_id join challenge_members on challenge_members.challenge_id = rounds.challenge_id where bets.id = bet_selections.bet_id and challenge_members.user_id = auth.uid()));
create policy "members can update selections" on bet_selections for update using (exists (select 1 from bets join rounds on rounds.id = bets.round_id join challenge_members on challenge_members.challenge_id = rounds.challenge_id where bets.id = bet_selections.bet_id and challenge_members.user_id = auth.uid()));
create policy "members can delete selections" on bet_selections for delete using (exists (select 1 from bets join rounds on rounds.id = bets.round_id join challenge_members on challenge_members.challenge_id = rounds.challenge_id where bets.id = bet_selections.bet_id and challenge_members.user_id = auth.uid()));
create policy "members can read matches" on matches for select using (auth.uid() is not null);
create policy "authenticated users can upsert matches" on matches for insert with check (auth.uid() is not null);
create policy "authenticated users can update matches" on matches for update using (auth.uid() is not null);
alter publication supabase_realtime add table rounds, bets, bet_selections, matches;
