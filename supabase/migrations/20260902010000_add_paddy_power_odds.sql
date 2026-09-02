create table public.paddy_power_odds (
  competition text primary key,
  fetched_at timestamptz not null,
  matches jsonb not null,
  raw jsonb,
  updated_at timestamptz not null default now()
);

alter table public.paddy_power_odds enable row level security;

create policy "authenticated users can view paddy power odds"
on public.paddy_power_odds for select to authenticated
using (auth.uid() is not null);
