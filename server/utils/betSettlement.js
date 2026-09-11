import { getFootballProvider } from '~/lib/football/provider.js'
import { evaluateSelection } from '~/lib/settlement.js'

// Bet Builder player-prop legs (goalscorer, card, saves, ...) need the full
// play-by-play breakdown, not just the final score — fetched lazily, only for
// matches where the plain score-based rules below couldn't resolve a selection, and
// cached per match id so several legs sharing one match only pay for it once.
export function createEventCaches(client) {
  const eventsCache = new Map()
  async function eventsFor(matchId) {
    if (eventsCache.has(matchId)) return eventsCache.get(matchId)
    const matchEvents = await getFootballProvider()
      .getMatchEvents(matchId)
      .catch(() => null)
    if (matchEvents) {
      await client
        .from('matches')
        .update({ events: matchEvents })
        .eq('provider', 'espn')
        .eq('provider_match_id', matchId)
    }
    eventsCache.set(matchId, matchEvents)
    return matchEvents
  }

  // Per-player counting stats (fouls, shots) need the full paginated play-by-play,
  // which the cheaper tiers above don't touch — reserved for whatever's still
  // unresolved after those, and merged into (and persisted alongside) the same cached
  // events object rather than a separate fetch/column.
  const playerStatsCache = new Map()
  async function withPlayerStats(matchId, baseEvents) {
    if (playerStatsCache.has(matchId)) return playerStatsCache.get(matchId)
    const playerStats = await getFootballProvider()
      .getPlayerMatchStats(matchId)
      .catch(() => null)
    const merged = playerStats ? { ...baseEvents, ...playerStats } : baseEvents
    if (playerStats) {
      await client
        .from('matches')
        .update({ events: merged })
        .eq('provider', 'espn')
        .eq('provider_match_id', matchId)
    }
    eventsCache.set(matchId, merged)
    playerStatsCache.set(matchId, merged)
    return merged
  }

  return { eventsFor, withPlayerStats }
}

// Runs one selection through all three settlement tiers (score-only, match summary,
// play-by-play), stopping as soon as one resolves it. Returns null if none can.
// `force` skips the cached `match.events` blob and always re-fetches tier 2 fresh —
// needed by a manual recheck, since the cached blob may predate a settlement logic
// change (e.g. a new field it now reads) and would otherwise never get refreshed.
export async function resolveOutcome(selection, match, caches, { force = false } = {}) {
  let outcome = evaluateSelection({ market: selection.market, pick: selection.pick, match })
  if (outcome !== null) return outcome

  const matchEvents = force || !match.events ? await caches.eventsFor(match.provider_match_id) : match.events
  if (!matchEvents) return null
  outcome = evaluateSelection({ market: selection.market, pick: selection.pick, match, events: matchEvents })
  if (outcome !== null) return outcome

  const enrichedEvents = await caches.withPlayerStats(match.provider_match_id, matchEvents)
  return evaluateSelection({ market: selection.market, pick: selection.pick, match, events: enrichedEvents })
}

// Recomputes one bet's aggregate status/return from its selections' current
// statuses, and marks its week settled once every bet in it has resolved. Returns
// null if the bet still has an unresolved leg (nothing to update).
export async function recomputeBetStatus(client, betId) {
  const { data: selections, error: selectionsError } = await client
    .from('bet_selections')
    .select('status')
    .eq('bet_id', betId)
  if (selectionsError) throw selectionsError
  const statuses = (selections || []).map((selection) => selection.status)
  const status = statuses.some((value) => value === 'lost')
    ? 'lost'
    : statuses.length > 0 && statuses.every((value) => value === 'won')
      ? 'won'
      : 'pending'
  if (status === 'pending') return null

  const { data: bet, error: betError } = await client
    .from('bets')
    .select('id, week_id, stake, combined_odds')
    .eq('id', betId)
    .single()
  if (betError) throw betError
  const actualReturn = status === 'won' ? Number(bet.stake) * Number(bet.combined_odds) : 0
  const { error: updateError } = await client
    .from('bets')
    .update({ status, actual_return: actualReturn })
    .eq('id', betId)
  if (updateError) throw updateError

  // A week can hold bets from several players — only mark it settled once every bet
  // in it has resolved, not just the one just settled.
  const { data: weekBets, error: weekBetsError } = await client
    .from('bets')
    .select('status')
    .eq('week_id', bet.week_id)
  if (weekBetsError) throw weekBetsError
  const weekFullySettled = (weekBets || []).every((weekBet) => ['won', 'lost'].includes(weekBet.status))
  if (weekFullySettled) {
    const { error: weekError } = await client.from('weeks').update({ status: 'settled' }).eq('id', bet.week_id)
    if (weekError) throw weekError
  }

  return { status, actualReturn }
}
