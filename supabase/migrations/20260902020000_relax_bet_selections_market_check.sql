-- Paddy Power exposes dozens of market names per fixture (handicaps, goalscorer
-- markets, correct score variants, etc.) that can't be enumerated into the
-- fixed match_result/double_chance/... set. Selections outside that set simply
-- don't auto-settle (see lib/settlement.js evaluateSelection default case) and
-- still store/display fine, so replace the whitelist with a basic non-empty check.
alter table public.bet_selections drop constraint if exists bet_selections_market_check;

alter table public.bet_selections
  add constraint bet_selections_market_check check (length(trim(market)) > 0);
