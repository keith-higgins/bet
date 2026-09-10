-- Stores the extracted goal/card/save/foul/corner summary for a finished match (pulled
-- from ESPN's play-by-play feed) so Bet Builder player-prop legs can be auto-settled
-- without re-paginating plays on every sync run. Null until a match has been settled at
-- least once; only meaningful once the match is finished.
alter table public.matches add column events jsonb;
