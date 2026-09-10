import { canonicalTeamName } from './teamAliases.js'

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

// Bet Builder picks for team-level stat markets sometimes name a role rather than the
// bare team ("Man Utd Goalkeeper") — strip that off and resolve through the alias table
// (canonicalTeamName), since "man utd" isn't a literal substring of "manchester united".
function pickSide(normalizedPick, home, away) {
  const stripped = normalizedPick.replace(/\b(goalkeeper|keeper|gk)\b/g, '').trim() || normalizedPick
  const candidate = canonicalTeamName(stripped)
  if (candidate === canonicalTeamName(home)) return 'home'
  if (candidate === canonicalTeamName(away)) return 'away'
  if (normalizedPick.includes(normalize(home)) || normalize(home).includes(normalizedPick)) return 'home'
  if (normalizedPick.includes(normalize(away)) || normalize(away).includes(normalizedPick)) return 'away'
  if (/\bhome\b/.test(normalizedPick)) return 'home'
  if (/\baway\b/.test(normalizedPick)) return 'away'
  return null
}

// Per-player count maps are keyed by ESPN's exact display name — look up by
// normalized equality rather than assuming casing matches the pick text verbatim.
function countOf(counts, normalizedPick) {
  const entry = Object.entries(counts).find(([player]) => normalize(player) === normalizedPick)
  return entry?.[1] || 0
}

// Player-prop / team-stat Bet Builder legs (goalscorer, assister, card, saves, fouls,
// corners) — settled from ESPN's match summary rather than the final score alone.
function evaluatePlayByPlaySelection({ market, normalizedPick, home, away, events }) {
  if (!events) return null
  const normalizedMarket = normalize(market)

  if (/to score or assist$/.test(normalizedMarket)) {
    const scored = events.goalScorers.some((scorer) => normalize(scorer) === normalizedPick)
    const assisted = events.assisters.some((assister) => normalize(assister) === normalizedPick)
    return scored || assisted
  }
  if (/to score$/.test(normalizedMarket)) {
    return events.goalScorers.some((scorer) => normalize(scorer) === normalizedPick)
  }
  if (/to assist$/.test(normalizedMarket)) {
    return events.assisters.some((assister) => normalize(assister) === normalizedPick)
  }

  // Just a count over the same assisters list "to assist" already uses — no extra data.
  const assistsCountMatch = normalizedMarket.match(/^player to have (\d+)\+?\s*or more assists$/)
  if (assistsCountMatch) {
    const count = events.assisters.filter((assister) => normalize(assister) === normalizedPick).length
    return count >= Number(assistsCountMatch[1])
  }

  if (/to be (shown a card|booked|carded)/.test(normalizedMarket)) {
    return events.cardedPlayers.some((card) => normalize(card.player) === normalizedPick)
  }

  const savesMatch = normalizedMarket.match(/goalkeeper to make (\d+)\+?\s*or more saves/)
  if (savesMatch) {
    const side = pickSide(normalizedPick, home, away)
    if (!side) return null
    return events.saveCounts[side] >= Number(savesMatch[1])
  }

  const foulsMatch = normalizedMarket.match(/^team to commit (\d+)\+?\s*or more fouls$/)
  if (foulsMatch) {
    const side = pickSide(normalizedPick, home, away)
    if (!side) return null
    return events.foulCounts[side] >= Number(foulsMatch[1])
  }

  // The market header just says "Over/Under" (both words, no direction) — the actual
  // direction only lives on the pick itself ("Over 6.5 Corners"), so read it from
  // there. A combined-string regex would always latch onto "under" as the closer match
  // to the market's own threshold digits, regardless of what was actually picked.
  if (/corners?/.test(normalizedMarket)) {
    const pickMatch = normalizedPick.match(/(over|under)\D*(\d+(?:\.\d+)?)/)
    if (pickMatch) {
      const [, direction, thresholdText] = pickMatch
      const threshold = Number(thresholdText)
      const totalCorners = events.cornerCounts.home + events.cornerCounts.away
      return direction === 'over' ? totalCorners > threshold : totalCorners < threshold
    }
  }

  // Team-level only — ESPN's boxscore gives shots-on-target per team, not per player.
  const shotsMatch = normalizedMarket.match(/^team to have (\d+)\+?\s*or more shots on target$/)
  if (shotsMatch) {
    const side = pickSide(normalizedPick, home, away)
    if (!side) return null
    return events.shotsOnTargetCounts[side] >= Number(shotsMatch[1])
  }

  // Per-player counting stats (fouls committed/suffered, total shots) only exist on
  // `events` once the expensive play-by-play tier has actually run — until then these
  // three stay unresolved (manual) rather than reading a missing count as zero and
  // wrongly settling as a loss.
  const foulsCommittedMatch = normalizedMarket.match(/^player to commit (\d+)\+?\s*or more fouls$/)
  if (foulsCommittedMatch) {
    if (!events.foulCommittedCounts) return null
    return countOf(events.foulCommittedCounts, normalizedPick) >= Number(foulsCommittedMatch[1])
  }

  const fouledMatch = normalizedMarket.match(/^player to be fouled (\d+)\+?\s*or more times$/)
  if (fouledMatch) {
    if (!events.foulSufferedCounts) return null
    return countOf(events.foulSufferedCounts, normalizedPick) >= Number(fouledMatch[1])
  }

  // Player-level "on target" specifically — distinct from the all-attempts count below
  // and from the team-level version above. Checked first since its pattern is more
  // specific (the all-shots pattern's `$` anchor wouldn't match this text anyway, but
  // keeping the specific check first avoids relying on that).
  const playerShotsOnTargetMatch = normalizedMarket.match(
    /^player to have (\d+)\+?\s*or more shots on target$/
  )
  if (playerShotsOnTargetMatch) {
    if (!events.playerShotsOnTargetCounts) return null
    return countOf(events.playerShotsOnTargetCounts, normalizedPick) >= Number(playerShotsOnTargetMatch[1])
  }

  // All shot attempts (on target + off target + blocked) — distinct from the two
  // on-target-only markets above.
  const playerShotsMatch = normalizedMarket.match(/^player to have (\d+)\+?\s*or more shots$/)
  if (playerShotsMatch) {
    if (!events.shotCounts) return null
    return countOf(events.shotCounts, normalizedPick) >= Number(playerShotsMatch[1])
  }

  return null
}

export function evaluateSelection({ market, pick, match, events }) {
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

    // A 0-0 draw has no scoring events at all, so firstScoringTeam is null and this
    // stays unresolved (manual) rather than guessing at a "no goalscorer" pick.
    case 'first_team_to_score':
      if (!events?.firstScoringTeam) return null
      if (teamMatchesPick(pick, home, 'home') || normalizedPick === '1') {
        return events.firstScoringTeam === 'home'
      }
      if (teamMatchesPick(pick, away, 'away') || normalizedPick === '2') {
        return events.firstScoringTeam === 'away'
      }
      return null

    // Full-time handicap: "<team> <+/-line>" e.g. "Man Utd -1", "Everton +0.5".
    // A push (adjusted scores level) has no clean win/lose answer, so it's left
    // unresolved (null) rather than guessed.
    case 'handicap': {
      const lineMatch = pick.match(/^(.*?)\s*([+-]?\d+(?:\.\d+)?)$/)
      if (!lineMatch) return null
      const [, teamPart, lineText] = lineMatch
      const line = Number(lineText)
      if (teamMatchesPick(teamPart, home, 'home')) {
        const adjusted = homeScore + line
        if (adjusted === awayScore) return null
        return adjusted > awayScore
      }
      if (teamMatchesPick(teamPart, away, 'away')) {
        const adjusted = awayScore + line
        if (adjusted === homeScore) return null
        return adjusted > homeScore
      }
      return null
    }

    // "<team> by <n>[+]" e.g. "Man Utd by 2", "Everton by 3+"; or "Draw".
    case 'winning_margin': {
      if (['draw', 'x'].includes(normalizedPick)) return result === 'draw'
      const marginMatch = normalizedPick.match(/^(.*?)\s*by\s*(\d+)(\+)?$/)
      if (!marginMatch) return null
      const [, teamPart, marginText, plus] = marginMatch
      const margin = Number(marginText)
      let diff
      if (teamMatchesPick(teamPart, home, 'home')) diff = homeScore - awayScore
      else if (teamMatchesPick(teamPart, away, 'away')) diff = awayScore - homeScore
      else return null
      if (diff <= 0) return false
      return plus ? diff >= margin : diff === margin
    }

    case 'total_goals_odd_even': {
      const totalGoals = homeScore + awayScore
      if (normalizedPick === 'odd') return totalGoals % 2 === 1
      if (normalizedPick === 'even') return totalGoals % 2 === 0
      return null
    }

    // Pick is just the team expected to keep a clean sheet, independent of result.
    case 'clean_sheet':
      if (teamMatchesPick(pick, home, 'home')) return awayScore === 0
      if (teamMatchesPick(pick, away, 'away')) return homeScore === 0
      return null

    // "<result> & Yes/No" e.g. "Man Utd & Yes", "Draw & No".
    case 'result_and_btts': {
      const comboMatch = pick.match(/^(.*?)\s*&\s*(yes|no)$/i)
      if (!comboMatch) return null
      const [, resultPart, bttsPart] = comboMatch
      const normalizedResultPart = normalize(resultPart)
      let resultOk
      if (teamMatchesPick(resultPart, home, 'home') || normalizedResultPart === '1') {
        resultOk = result === 'home'
      } else if (teamMatchesPick(resultPart, away, 'away') || normalizedResultPart === '2') {
        resultOk = result === 'away'
      } else if (['draw', 'x'].includes(normalizedResultPart)) {
        resultOk = result === 'draw'
      } else {
        return null
      }
      const bothScored = homeScore > 0 && awayScore > 0
      const bttsOk = normalize(bttsPart) === 'yes' ? bothScored : !bothScored
      return resultOk && bttsOk
    }

    default:
      return evaluatePlayByPlaySelection({ market, normalizedPick, home, away, events })
  }
}
