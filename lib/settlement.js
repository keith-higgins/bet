function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function scoresFor(match) {
  const homeScore = Number(match?.home_score ?? match?.homeScore)
  const awayScore = Number(match?.away_score ?? match?.awayScore)
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null
  return { homeScore, awayScore }
}

export function isFinishedMatch(match) {
  return /finished|complete|ended|full\s*time|\bft\b/i.test(String(match?.status || ''))
}

function resultFor(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

function teamMatchesPick(pick, team, fallback) {
  const normalizedPick = normalize(pick)
  return normalizedPick === normalize(team) || normalizedPick === fallback
}

export function evaluateSelection({ market, pick, match }) {
  if (!isFinishedMatch(match)) return null
  const scores = scoresFor(match)
  if (!scores) return null

  const { homeScore, awayScore } = scores
  const home = match.home_team || match.home || ''
  const away = match.away_team || match.away || ''
  const result = resultFor(homeScore, awayScore)
  const normalizedPick = normalize(pick)

  switch (market) {
    case 'match_result':
      if (teamMatchesPick(pick, home, 'home') || normalizedPick === '1') return result === 'home'
      if (teamMatchesPick(pick, away, 'away') || normalizedPick === '2') return result === 'away'
      if (['draw', 'x'].includes(normalizedPick)) return result === 'draw'
      return null

    case 'double_chance': {
      const includesHome =
        normalizedPick.includes(normalize(home)) || /\bhome\b/.test(normalizedPick)
      const includesAway =
        normalizedPick.includes(normalize(away)) || /\baway\b/.test(normalizedPick)
      const includesDraw =
        normalizedPick.includes('draw') || ['x', '1x', 'x2'].includes(normalizedPick)
      if (normalizedPick === '1x' || (includesHome && includesDraw)) {
        return result === 'home' || result === 'draw'
      }
      if (normalizedPick === 'x2' || (includesDraw && includesAway)) {
        return result === 'draw' || result === 'away'
      }
      if (normalizedPick === '12' || (includesHome && includesAway)) {
        return result !== 'draw'
      }
      return null
    }

    case 'both_teams_score': {
      const yes = ['yes', 'y'].includes(normalizedPick)
      const bothScored = homeScore > 0 && awayScore > 0
      if (!yes && !['no', 'n'].includes(normalizedPick)) return null
      return yes === bothScored
    }

    case 'total_goals': {
      const totalGoals = homeScore + awayScore
      const threshold = Number(normalizedPick.match(/(\d+(?:\.\d+)?)/)?.[1])
      if (!Number.isFinite(threshold)) return null
      if (normalizedPick.startsWith('over')) return totalGoals > threshold
      if (normalizedPick.startsWith('under')) return totalGoals < threshold
      return null
    }

    case 'draw_no_bet':
      if (result === 'draw') return null
      if (teamMatchesPick(pick, home, 'home') || normalizedPick === '1') return result === 'home'
      if (teamMatchesPick(pick, away, 'away') || normalizedPick === '2') return result === 'away'
      return null

    case 'win_to_nil':
      if (teamMatchesPick(pick, home, 'home') || normalizedPick === '1') {
        return homeScore > awayScore && awayScore === 0
      }
      if (teamMatchesPick(pick, away, 'away') || normalizedPick === '2') {
        return awayScore > homeScore && homeScore === 0
      }
      return null

    case 'correct_score': {
      const expected = normalizedPick.match(/^(\d+)\s*[-:]\s*(\d+)$/)
      if (!expected) return null
      return homeScore === Number(expected[1]) && awayScore === Number(expected[2])
    }

    case 'first_team_to_score':
      return null
    default:
      return null
  }
}
