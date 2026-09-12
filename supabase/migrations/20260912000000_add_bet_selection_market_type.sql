-- Paddy Power's own market naming is unreliable for matching (the same market can be
-- worded differently across matches/competitions, e.g. "Anytime Goalscorer" vs "Player
-- To Score" both being their internal marketType TO_SCORE) — their raw data carries a
-- stable machine id (marketType) per market that we were discarding. Stored alongside
-- `market` (still the display text) rather than replacing it; null for older rows and
-- for manual/non-Paddy-Power picks, which keep matching on `market` text as before.
alter table public.bet_selections add column market_type text;
