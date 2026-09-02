import { decimalToFractional, isValidFractionalOdds } from '~/lib/odds.js'

export function paddyPowerOddsToFractional(oddsText) {
  const fractionalPart = String(oddsText || '').split(' (')[0].trim()
  if (isValidFractionalOdds(fractionalPart)) return fractionalPart

  const decimalMatch = String(oddsText || '').match(/\(([\d.]+)\)/)
  const decimal = decimalMatch ? Number(decimalMatch[1]) : Number(oddsText)
  return Number.isFinite(decimal) && decimal > 1 ? decimalToFractional(decimal) : ''
}

export const BET_MARKETS = [
  { label: 'Match result', databaseValue: 'match_result', pickType: 'match-result' },
  { label: 'Double chance', databaseValue: 'double_chance', pickType: 'double-chance' },
  { label: 'Both teams to score', databaseValue: 'both_teams_score', pickType: 'yes-no' },
  { label: 'Total goals', databaseValue: 'total_goals', pickType: 'total-goals' },
  {
    label: 'First team to score',
    databaseValue: 'first_team_to_score',
    pickType: 'team-or-none'
  },
  { label: 'Draw no bet', databaseValue: 'draw_no_bet', pickType: 'team' },
  { label: 'To win to nil', databaseValue: 'win_to_nil', pickType: 'team' },
  { label: 'Correct score', databaseValue: 'correct_score', pickType: 'text' }
]

// Paddy Power's own market labels for the handful of concepts that map cleanly
// onto our fixed settlement categories (lib/settlement.js). Everything else it
// returns (handicaps, goalscorer markets, etc.) has no equivalent here and is
// stored as free text — it just won't auto-settle.
const PADDY_POWER_MARKET_ALIASES = {
  'Match Odds': 'match_result',
  'Double Chance': 'double_chance',
  'Both teams to Score?': 'both_teams_score',
  'To Win to Nil': 'win_to_nil',
  'Correct Score': 'correct_score',
  'Result & Both to Score': 'result_and_btts'
}

export const MARKET_DATABASE_VALUES = {
  ...Object.fromEntries(BET_MARKETS.map((market) => [market.label, market.databaseValue])),
  ...PADDY_POWER_MARKET_ALIASES
}

// Paddy Power bakes the goal line into the market name itself (e.g. "Over/Under
// 6.5 Goals"), and offers several full-time handicap variants — these still
// settle from the final score alone (lib/settlement.js), so pattern-match them
// onto the same categories rather than requiring an exact label per line.
// Deliberately excludes anything scoped to a half ("1st Half ...", "Half Time/
// Full Time") since those need data (half-time score) we don't have.
const MARKET_PATTERN_RULES = [
  { pattern: /^over\/under\s+[\d.]+\s+goals$/i, value: 'total_goals' },
  { pattern: /^(handicap betting|alternative handicaps(\s+\d+)?)$/i, value: 'handicap' },
  { pattern: /^winning margin$/i, value: 'winning_margin' },
  { pattern: /^(total goals\s*-?\s*)?odd\s*\/\s*even$/i, value: 'total_goals_odd_even' },
  { pattern: /^(?!.*half).*clean sheet.*$/i, value: 'clean_sheet' }
]

export function resolveMarketDatabaseValue(marketLabel) {
  const label = String(marketLabel || '').trim()
  if (MARKET_DATABASE_VALUES[label]) return MARKET_DATABASE_VALUES[label]
  const rule = MARKET_PATTERN_RULES.find(({ pattern }) => pattern.test(label))
  return rule ? rule.value : label
}

export const MARKET_UI_VALUES = Object.fromEntries(
  BET_MARKETS.map((market) => [market.databaseValue, market.label])
)

export function getMatchTeams(leg = {}) {
  const home = leg.home || ''
  const away = leg.away || ''
  if (home && away) return { home, away }

  const match = String(leg.match || '')
  const parts = match.split(/\s+v(?:s)?\.?\s+/i)
  return {
    home: home || parts[0]?.trim() || '',
    away: away || parts[1]?.trim() || ''
  }
}

export function getMarketPickOptions(leg = {}) {
  const market = BET_MARKETS.find((item) => item.label === leg.market)
  if (!market) return []

  const { home, away } = getMatchTeams(leg)
  switch (market.pickType) {
    case 'match-result':
      return home && away ? [home, 'Draw', away] : []
    case 'double-chance':
      return home && away ? [`${home} or Draw`, `Draw or ${away}`, `${home} or ${away}`] : []
    case 'yes-no':
      return ['Yes', 'No']
    case 'total-goals':
      return [
        'Over 0.5',
        'Under 0.5',
        'Over 1.5',
        'Under 1.5',
        'Over 2.5',
        'Under 2.5',
        'Over 3.5',
        'Under 3.5'
      ]
    case 'team-or-none':
      return home && away ? [home, away, 'No goal'] : []
    case 'team':
      return home && away ? [home, away] : []
    default:
      return []
  }
}
