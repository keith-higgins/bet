alter table public.bet_selections drop constraint if exists bet_selections_market_check;

alter table public.bet_selections
  add constraint bet_selections_market_check check (
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
  );
