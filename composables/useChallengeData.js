import { createClient } from '@supabase/supabase-js'

function toDatabaseMarket(market) {
  return { 'Match result': 'match_result', 'Both teams to score': 'both_teams_score', 'Total goals': 'total_goals' }[market] || market
}

function toUiMarket(market) {
  return { match_result: 'Match result', both_teams_score: 'Both teams to score', total_goals: 'Total goals' }[market] || market
}

function toUiRound(row) {
  const dbBet = row.bets?.[0]
  return {
    id: row.id,
    challengeId: row.challenge_id,
    bettorId: row.bettor_id,
    week: row.week,
    title: row.title,
    dates: new Date(row.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    deadline: row.deadline,
    bettor: 'Keith',
    stake: Number(row.stake),
    status: row.status,
    bets: [{ id: dbBet?.id || null, bettor: 'Keith', bettorId: dbBet?.bettor_id || row.bettor_id, type: dbBet?.bet_type || 'Accumulator', stake: Number(dbBet?.stake || row.stake), status: dbBet?.status || 'pending', actualReturn: dbBet?.actual_return == null ? null : Number(dbBet.actual_return), selections: (dbBet?.bet_selections || []).map(selection => ({ id: selection.id, matchId: selection.matches?.provider_match_id || selection.match_id, match: selection.matches ? `${selection.matches.home_team} v ${selection.matches.away_team}` : '', market: toUiMarket(selection.market), pick: selection.pick, odds: Number(selection.odds), status: selection.status })) }]
  }
}

export function useChallengeData() {
  const config = useRuntimeConfig()
  const client = config.public.supabaseUrl && config.public.supabaseAnonKey ? createClient(config.public.supabaseUrl, config.public.supabaseAnonKey) : null
  const databaseEnabled = computed(() => Boolean(client))
  const loading = ref(false)
  const lastError = ref('')

  async function loadCurrentRound() {
    if (!client) return null
    loading.value = true
    lastError.value = ''
    try {
      const { data, error } = await client.from('rounds').select('*, bets(*, bet_selections(*, matches(provider_match_id, home_team, away_team)))').order('week', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data ? toUiRound(data) : null
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not load the challenge from Supabase:', error.message)
      return null
    } finally { loading.value = false }
  }

  async function loadRounds() {
    if (!client) return []
    loading.value = true
    lastError.value = ''
    try {
      const { data, error } = await client.from('rounds').select('*, bets(*, bet_selections(*, matches(provider_match_id, home_team, away_team)))').order('week', { ascending: false })
      if (error) throw error
      return (data || []).map(toUiRound)
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not load challenge history from Supabase:', error.message)
      return []
    } finally { loading.value = false }
  }

  async function saveBetToDatabase({ roundId, bettorId, bet, legs, matches }) {
    if (!client || !roundId || !bettorId) return false
    loading.value = true
    try {
      const combinedOdds = legs.reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
      const payload = { round_id: roundId, bettor_id: bettorId, bet_type: bet.type, stake: bet.stake, combined_odds: combinedOdds, status: 'pending' }
      const { data: savedBet, error: betError } = await client.from('bets').upsert(payload, { onConflict: 'round_id,bettor_id' }).select('id').single()
      if (betError) throw betError
      const matchRows = legs.map((leg, index) => {
        const source = matches[index]
        const label = String(leg.match || 'Unlinked match')
        const manualId = `manual-${index}-${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const [home, away] = label.split(/\s+v(?:s)?\.?\s+/i)
        return { provider: source?.provider || 'manual', provider_match_id: leg.matchId || source?.id || manualId, home_team: source?.home || home || label, away_team: source?.away || away || 'Selection', home_score: source?.homeScore ?? null, away_score: source?.awayScore ?? null, status: source?.status || 'scheduled', minute: source?.minute || null }
      })
      const { data: savedMatches, error: matchError } = await client.from('matches').upsert(matchRows, { onConflict: 'provider,provider_match_id' }).select('id, provider_match_id')
      if (matchError) throw matchError
      const matchIds = Object.fromEntries(savedMatches.map(match => [match.provider_match_id, match.id]))
      await client.from('bet_selections').delete().eq('bet_id', savedBet.id)
      const selectionRows = legs.map((leg, index) => { const label = String(leg.match || 'Unlinked match'); const manualId = `manual-${index}-${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); return { bet_id: savedBet.id, match_id: matchIds[leg.matchId || matches[index]?.id || manualId], market: toDatabaseMarket(leg.market), pick: leg.pick, odds: Number(leg.odds), status: 'pending' } }).filter(selection => selection.match_id)
      const { error: selectionError } = await client.from('bet_selections').insert(selectionRows)
      if (selectionError) throw selectionError
      return true
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not save the bet to Supabase:', error.message)
      return false
    } finally { loading.value = false }
  }

  async function settleBetInDatabase({ betId, selectionStatuses, stake, combinedOdds }) {
    const statuses = selectionStatuses.map(selection => selection.status)
    const overallStatus = statuses.some(status => status === 'lost') ? 'lost' : statuses.length > 0 && statuses.every(status => status === 'won') ? 'won' : 'pending'
    const actualReturn = overallStatus === 'won' ? Number(stake) * Number(combinedOdds) : overallStatus === 'lost' ? 0 : null
    if (!client || !betId) return { status: overallStatus, actualReturn }
    loading.value = true
    try {
      for (const selection of selectionStatuses) {
        const { error } = await client.from('bet_selections').update({ status: selection.status }).eq('id', selection.id)
        if (error) throw error
      }
      const { error: betError } = await client.from('bets').update({ status: overallStatus, actual_return: actualReturn }).eq('id', betId)
      if (betError) throw betError
      return { status: overallStatus, actualReturn }
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not settle the bet in Supabase:', error.message)
      return null
    } finally { loading.value = false }
  }

  async function createInitialChallenge() {
    if (!client) return null
    loading.value = true
    try {
      const { data: userResult, error: userError } = await client.auth.getUser()
      if (userError || !userResult.user) throw userError || new Error('You need to sign in first.')
      const user = userResult.user
      const challengeId = crypto.randomUUID()
      const { error: challengeError } = await client.from('challenges').insert({ id: challengeId, name: 'Double Chance', owner_id: user.id, currency: 'EUR' })
      if (challengeError) throw challengeError
      const { error: memberError } = await client.from('challenge_members').insert({ challenge_id: challengeId, user_id: user.id, display_name: user.email?.split('@')[0] || 'Keith', role: 'owner' })
      if (memberError) throw memberError
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const roundId = crypto.randomUUID()
      const { error: roundError } = await client.from('rounds').insert({ id: roundId, challenge_id: challengeId, week: 1, title: 'First challenge weekend', bettor_id: user.id, stake: 20, deadline, status: 'in_progress' })
      if (roundError) throw roundError
      return toUiRound({ id: roundId, week: 1, title: 'First challenge weekend', bettor_id: user.id, stake: 20, deadline, status: 'in_progress', bets: [] })
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not create the first challenge:', error.message)
      return null
    } finally { loading.value = false }
  }

  async function createRound({ challengeId, week, title, bettorId, stake, deadline }) {
    if (!client) return null
    loading.value = true
    try {
      const { data, error } = await client.from('rounds').insert({ challenge_id: challengeId, week, title, bettor_id: bettorId, stake, deadline, status: 'in_progress' }).select('*').single()
      if (error) throw error
      return toUiRound({ ...data, bets: [] })
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not create the new round:', error.message)
      return null
    } finally { loading.value = false }
  }

  async function deleteChallenge(challengeId) {
    if (!client || !challengeId) return false
    loading.value = true
    try {
      const { error } = await client.from('challenges').delete().eq('id', challengeId)
      if (error) throw error
      return true
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not delete the challenge:', error.message)
      return false
    } finally { loading.value = false }
  }

  async function updateRound(roundId, changes) {
    if (!client || !roundId) return false
    const { error } = await client.from('rounds').update(changes).eq('id', roundId)
    if (error) { lastError.value = error.message; return false }
    return true
  }

  return { databaseEnabled, loading, lastError, loadCurrentRound, loadRounds, saveBetToDatabase, settleBetInDatabase, createInitialChallenge, createRound, updateRound, deleteChallenge }
}
