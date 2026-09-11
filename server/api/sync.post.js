import { createClient } from '@supabase/supabase-js'
import { getFootballProvider } from '~/lib/football/provider.js'
import { isFinishedMatch } from '~/lib/settlement.js'
import { createEventCaches, resolveOutcome, recomputeBetStatus } from '~/server/utils/betSettlement.js'

function requestedIds(event) {
  return String(getQuery(event).ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function checkSyncSecret(event, secret) {
  if (!secret) return
  const token = (getHeader(event, 'authorization') || '').replace(/^Bearer\s+/i, '')
  if (token !== secret)
    throw createError({ statusCode: 401, statusMessage: 'Invalid sync secret.' })
}

function adminClient() {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) return null
  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)
}

async function databaseMatchIds(client, ids) {
  if (ids.length || !client) return ids
  const { data, error } = await client
    .from('matches')
    .select('provider_match_id')
    .eq('provider', 'espn')
  if (error) throw error
  return (data || []).map((match) => match.provider_match_id).filter(Boolean)
}

async function saveMatches(client, fixtures) {
  if (!fixtures.length) return
  const syncedAt = new Date().toISOString()
  const rows = fixtures.map((fixture) => ({
    provider: fixture.provider,
    provider_match_id: fixture.id,
    home_team: fixture.home,
    away_team: fixture.away,
    home_score: fixture.homeScore,
    away_score: fixture.awayScore,
    status: fixture.status,
    minute: fixture.minute,
    starts_at: fixture.startsAt,
    updated_at: syncedAt
  }))
  const { error } = await client
    .from('matches')
    .upsert(rows, { onConflict: 'provider,provider_match_id' })
  if (error) throw error
}

async function settleFinishedSelections(client, fixtures) {
  const finishedIds = new Set(fixtures.filter(isFinishedMatch).map((fixture) => String(fixture.id)))
  if (!finishedIds.size) return { selections: 0, bets: 0 }

  const { data: pendingSelections, error: selectionError } = await client
    .from('bet_selections')
    .select(
      'id, bet_id, market, pick, status, matches(provider_match_id, home_team, away_team, home_score, away_score, status, events)'
    )
    .eq('status', 'pending')
  if (selectionError) throw selectionError

  const caches = createEventCaches(client)

  const affectedBetIds = new Set()
  let settledSelections = 0
  for (const selection of pendingSelections || []) {
    const match = selection.matches
    if (!match || !finishedIds.has(String(match.provider_match_id))) continue
    const outcome = await resolveOutcome(selection, match, caches)
    if (outcome === null) continue
    const { data: updatedSelection, error } = await client
      .from('bet_selections')
      .update({ status: outcome ? 'won' : 'lost' })
      .eq('id', selection.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (updatedSelection) {
      affectedBetIds.add(selection.bet_id)
      settledSelections += 1
    }
  }

  let settledBets = 0
  for (const betId of affectedBetIds) {
    const result = await recomputeBetStatus(client, betId)
    if (result) settledBets += 1
  }

  return { selections: settledSelections, bets: settledBets }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  checkSyncSecret(event, config.syncSecret)
  const client = adminClient()
  const ids = await databaseMatchIds(client, requestedIds(event))
  let syncRun = null

  if (client) {
    const { data, error } = await client
      .from('match_sync_runs')
      .insert({ provider: 'espn', status: 'started' })
      .select('id')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    syncRun = data.id
  }

  try {
    const matches = await getFootballProvider().getLiveMatches(ids)
    let settlement = { selections: 0, bets: 0 }
    if (client) {
      await saveMatches(client, matches)
      settlement = await settleFinishedSelections(client, matches)
      const { error } = await client
        .from('match_sync_runs')
        .update({ status: 'completed', finished_at: new Date().toISOString() })
        .eq('id', syncRun)
      if (error) throw error
    }
    return {
      ok: true,
      provider: 'espn',
      matches,
      settlement,
      syncedAt: new Date().toISOString()
    }
  } catch (error) {
    if (client && syncRun) {
      await client
        .from('match_sync_runs')
        .update({ status: 'failed', finished_at: new Date().toISOString(), error: error.message })
        .eq('id', syncRun)
    }
    throw createError({ statusCode: 502, statusMessage: error.message || 'Football sync failed.' })
  }
})
