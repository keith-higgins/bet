// Paddy Power's own market categorization — captured from their real event-page
// response (`payload.layout.cards[*].marketTypes`) across several Premier League
// fixtures, September 2026 (see scripts/inspectPaddyPowerMarkets.mjs). Two things
// that finding revealed, which this table encodes:
//
// 1. Some of their tabs (Shots, Corners, Cards & Fouls) enumerate the exact,
//    already-instantiated marketType strings — a direct lookup (EXACT_CATEGORIES).
// 2. Others (Goals, Over/Under) use generic "V_"-prefixed templates that don't
//    literally match any real market's marketType (e.g. the template is
//    "V_OVER_UNDER" but the real market is "OVER_UNDER_2.5") — handled here as
//    prefix rules (PREFIX_CATEGORIES) instead.
// 3. A chunk of core markets (Match Odds, Correct Score, Double Chance, Half Time,
//    goalkeeper saves, first goalscorer, ...) never appear in ANY of PP's own real
//    tabs — confirmed against the live match page too, not just the API — because
//    PP shows them unconditionally outside the tab system entirely. These get their
//    own "Match & Result" / "Goalkeeper" buckets here rather than forcing them into
//    a PP tab that was never going to contain them.
export const CATEGORIES = [
  { key: 'result', label: 'Match & Result' },
  { key: 'goals', label: 'Goals' },
  { key: 'over-under', label: 'Over/Under' },
  { key: 'shots', label: 'Shots' },
  { key: 'corners', label: 'Corners' },
  { key: 'cards-fouls', label: 'Cards & Fouls' },
  { key: 'goalkeeper', label: 'Goalkeeper' },
  { key: 'other', label: 'Specials & other' }
]

const EXACT_CATEGORIES = {
  ANYTIME_ASSIST: 'goals',
  TO_SCORE: 'goals',
  FIRST_GOAL_SCORER: 'goals',
  GOAL_01: 'goals',
  '1ST_HALF_FIRST_GOAL': 'goals',
  TO_SCORE_OR_ASSIST: 'goals',
  TO_SCORE_OR_TO_BE_SHOWN_A_CARD: 'goals',
  BOTH_TEAMS_TO_SCORE: 'goals',
  BOTH_TEAMS_TO_SCORE_FIRST_HALF: 'goals',
  BOTH_TEAMS_TO_SCORE_BOTH_HALVES: 'goals',
  BOTH_TEAMS_TO_SCORE_TWICE: 'goals',
  'BTTS_&_NO_DRAW': 'goals',
  MATCH_ODDS_AND_BOTH_TEAMS_TO_SCORE: 'goals',
  GOAL_SCORED_IN_BOTH_HALVES: 'goals',
  HALF_WITH_MOST_GOALS: 'goals',
  MATCH_SHOTS: 'shots',
  MATCH_SHOTS_ON_TARGET: 'shots',
  HOME_TEAM_SHOTS_ON_TARGET_IN_EACH_HALF: 'shots',
  AWAY_TEAM_SHOTS_ON_TARGET_IN_EACH_HALF: 'shots',
  CORNERS_MATCH_BET: 'corners',
  CORNERS_HANDICAP: 'corners',
  FIRST_HALF_CORNERS: 'corners',
  ALTERNATE_FIRST_HALF_CORNERS: 'corners',
  V_RACE_TO_CORNERS: 'corners',
  TOTAL_MATCH_CORNERS: 'corners',
  TO_BE_BOOKED: 'cards-fouls',
  TEAM_TO_RECEIVE_THE_MOST_CARDS: 'cards-fouls',
  RED_CARD_MARKETS: 'cards-fouls',
  MATCH_ODDS: 'result',
  DOUBLE_CHANCE: 'result',
  CORRECT_SCORE: 'result',
  CORRECT_SCORE_COMBINATIONS: 'result',
  HANDICAP_BETTING: 'result',
  FIRST_HALF_HANDICAP_WITH_TIE: 'result',
  TO_WIN_TO_NIL: 'result',
  DRAW_NO_BET: 'result',
  WINNING_MARGIN: 'result',
  'WIN-DRAW-WIN.': 'result',
  HALF_TIME: 'result',
  HALF_TIME_FULL_TIME: 'result',
  HALF_TIME_SCORE: 'result',
  TO_LEAD_AT_HT_OR_FT: 'result',
  WIN_BOTH_HALVES: 'result',
  WIN_EITHER_HALF: 'result',
  TO_SCORE_IN_BOTH_HALVES: 'result',
  'PENALTY_AWARDED_YES/NO': 'result',
  'LEAD_AT_10-20-30-60_MINUTES': 'result',
  POWER_PRICES: 'other',
  '#WHATODDSPADDY_-_INPLAY': 'other'
}

// Checked via startsWith, longest prefix first (so a more specific rule like
// "OVER_UNDER_HALF_TIME_" wins over the shorter "OVER_UNDER_" it would otherwise
// also match).
const PREFIX_CATEGORIES = [
  ['ALTERNATIVE_HANDICAPS', 'result'],
  ['PRE_MATCH_COMBO', 'other'],
  ['#WHATODDSPADDY', 'other'],
  ['GOALKEEPER_TO_MAKE', 'goalkeeper'],
  ['OVER_UNDER_HALF_TIME_', 'over-under'],
  ['HALF_TIME_OVER/UNDER_', 'over-under'],
  ['MATCH_ODDS_AND_OVER/UNDER_', 'over-under'],
  ['OVER_UNDER_', 'over-under'],
  ['MULTIGOL', 'over-under'],
  ['V_HOME_TEAM_TOTAL_GOALS', 'over-under'],
  ['V_AWAY_TEAM_TOTAL_GOALS', 'over-under'],
  ['V_HOME_TEAM_FIRST_HALF_GOALS', 'over-under'],
  ['V_AWAY_TEAM_FIRST_HALF_GOALS', 'over-under'],
  ['TO_SCORE_2_GOALS_OR_MORE', 'goals'],
  ['TO_SCORE_A_HAT-TRICK', 'goals'],
  ['PLAYER_TO_HAVE', 'shots'],
  ['TEAM_TO_HAVE', 'shots'],
  ['TOTAL_CORNERS_', 'corners'],
  ['HOME_TOTAL_CORNERS_', 'corners'],
  ['AWAY_TOTAL_CORNERS_', 'corners'],
  ['OVER/UNDER_', 'cards-fouls'],
  ['HOME_TEAM_TOTAL_CARDS_', 'cards-fouls'],
  ['AWAY_TEAM_TOTAL_CARDS_', 'cards-fouls'],
  ['PLAYER_TO_COMMIT', 'cards-fouls'],
  ['PLAYER_TO_WIN', 'cards-fouls'],
  ['TEAM_TO_COMMIT', 'cards-fouls']
]

// Legacy fallback for a selection with no marketType (older rows saved before this
// was tracked, or a manual/non-Paddy-Power pick) — matches on the free-text display
// name instead, same rules the app used before marketType was available.
const LEGACY_NAME_RULES = [
  { key: 'result', test: /match odds|double chance|draw no bet|to win to nil|^1x2$|^result$|both halves/i },
  { key: 'goals', test: /scorer|goal|both teams to score|btts/i },
  { key: 'result', test: /correct score/i },
  { key: 'result', test: /handicap/i },
  { key: 'result', test: /1st half|2nd half|first half|second half|half time|half-time/i }
]

function categoryByKey(key) {
  return CATEGORIES.find((category) => category.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

// `market` is a normalized market object — { name, marketType? }. Prefers matching
// on marketType (stable, unambiguous); falls back to the old name-regex heuristic
// when it's absent.
export function categorizeMarket(market) {
  const marketType = market?.marketType
  if (marketType) {
    if (EXACT_CATEGORIES[marketType]) return categoryByKey(EXACT_CATEGORIES[marketType])
    const prefixMatch = PREFIX_CATEGORIES.find(([prefix]) => marketType.startsWith(prefix))
    if (prefixMatch) return categoryByKey(prefixMatch[1])
    return categoryByKey('other')
  }
  const rule = LEGACY_NAME_RULES.find((item) => item.test.test(String(market?.name || '')))
  return categoryByKey(rule?.key || 'other')
}
