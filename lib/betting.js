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

export const MARKET_DATABASE_VALUES = Object.fromEntries(
  BET_MARKETS.map((market) => [market.label, market.databaseValue])
)

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
