import { getFootballProvider } from '~/lib/football/provider.js'
import { isFinishedMatch } from '~/lib/settlement.js'
import { requireAdmin, adminClient } from '~/server/utils/auth.js'
import { createEventCaches, resolveOutcome, recomputeBetStatus } from '~/server/utils/betSettlement.js'

const SELECTION_COLUMNS =
  'id, bet_id, market, market_type, pick, status, matches(provider, provider_match_id, home_team, away_team, home_score, away_score, status, minute, events)'

// Unlike /api/sync (which only ever touches still-pending selections, on the
// assumption its own last run got everything right), this re-evaluates every
// selection on one specific bet regardless of its current status — the only way to
// correct a leg that already settled wrong (e.g. from a since-fixed settlement bug),
// since a normal sync pass would just skip it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const betId = getRouterParam(event, 'id')
  const client = adminClient()

  const { data: selections, error: selectionError } = await client
    .from('bet_selections')
    .select(SELECTION_COLUMNS)
    .eq('bet_id', betId)
  if (selectionError) throw createError({ statusCode: 500, statusMessage: selectionError.message })
  if (!selections?.length) throw createError({ statusCode: 404, statusMessage: 'Bet not found.' })

  // Refresh each tracked match's score/status first — a manual recheck should reflect
  // the current live result, not whatever was last saved (which may predate any
  // automatic sync ever running for this match at all).
  const provider = getFootballProvider()
  const matchIds = [...new Set(selections.map((selection) => selection.matches?.provider_match_id).filter(Boolean))]
  const freshFixtures = await Promise.all(
    matchIds.map((matchId) => provider.getMatchResult(matchId).catch(() => null))
  )
  for (const fixture of freshFixtures.filter(Boolean)) {
    const { error } = await client
      .from('matches')
      .update({
        home_score: fixture.homeScore,
        away_score: fixture.awayScore,
        status: fixture.status,
        minute: fixture.minute,
        updated_at: new Date().toISOString()
      })
      .eq('provider', fixture.provider)
      .eq('provider_match_id', fixture.id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const { data: refreshedSelections, error: refreshedError } = await client
    .from('bet_selections')
    .select(SELECTION_COLUMNS)
    .eq('bet_id', betId)
  if (refreshedError) throw createError({ statusCode: 500, statusMessage: refreshedError.message })

  const caches = createEventCaches(client)
  const changed = []
  for (const selection of refreshedSelections) {
    const match = selection.matches
    if (!match || !isFinishedMatch(match)) continue
    const outcome = await resolveOutcome(selection, match, caches, { force: true })
    if (outcome === null) continue
    const nextStatus = outcome ? 'won' : 'lost'
    if (nextStatus === selection.status) continue
    const { error } = await client
      .from('bet_selections')
      .update({ status: nextStatus })
      .eq('id', selection.id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    changed.push({ id: selection.id, from: selection.status, to: nextStatus })
  }

  const betResult = await recomputeBetStatus(client, betId)

  const { data: finalSelections, error: finalError } = await client
    .from('bet_selections')
    .select('id, status')
    .eq('bet_id', betId)
  if (finalError) throw createError({ statusCode: 500, statusMessage: finalError.message })

  return { ok: true, changed, legs: finalSelections, bet: betResult }
})
