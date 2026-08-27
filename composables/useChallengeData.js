import { useSupabaseClient } from '~/lib/supabase'

function toDatabaseMarket(market) {
  return (
    {
      'Match result': 'match_result',
      'Both teams to score': 'both_teams_score',
      'Total goals': 'total_goals'
    }[market] || market
  )
}

function toUiMarket(market) {
  return (
    {
      match_result: 'Match result',
      both_teams_score: 'Both teams to score',
      total_goals: 'Total goals'
    }[market] || market
  )
}

function normalizeUser(user) {
  return {
    userId: user.userId || user.id || user.user_id,
    email: user.email || '',
    displayName:
      user.displayName ||
      user.display_name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'Player'
  }
}

function toUiWeek(row, users = []) {
  const directory = users.map(normalizeUser).filter((user) => user.userId)
  const participantIds = [row.bettor_id, ...(row.bets || []).map((bet) => bet.bettor_id)].filter(
    Boolean
  )
  const members = [...new Set(participantIds)].map((userId) => {
    const user = directory.find((item) => item.userId === userId)
    return {
      userId,
      email: user?.email || '',
      displayName: user?.displayName || 'Player',
      role: 'player'
    }
  })
  const memberName = (userId) =>
    members.find((member) => member.userId === userId)?.displayName || 'Player'
  return {
    id: row.id,
    bettorId: row.bettor_id,
    week: row.week,
    title: row.title,
    dates: new Date(row.deadline).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    deadline: row.deadline,
    bettor: memberName(row.bettor_id),
    stake: Number(row.stake),
    status: row.status,
    members,
    bets: (row.bets || []).map((dbBet) => ({
      id: dbBet.id || null,
      bettor: memberName(dbBet.bettor_id),
      bettorId: dbBet.bettor_id || row.bettor_id,
      type: dbBet.bet_type || 'Accumulator',
      stake: Number(dbBet.stake || row.stake),
      status: dbBet.status || 'pending',
      actualReturn: dbBet.actual_return == null ? null : Number(dbBet.actual_return),
      selections: (dbBet.bet_selections || []).map((selection) => ({
        id: selection.id,
        matchId: selection.matches?.provider_match_id || selection.match_id,
        match: selection.matches
          ? `${selection.matches.home_team} v ${selection.matches.away_team}`
          : '',
        market: toUiMarket(selection.market),
        pick: selection.pick,
        odds: Number(selection.odds),
        status: selection.status
      }))
    }))
  }
}

export function useChallengeData() {
  const client = useSupabaseClient()
  const playerContext = usePlayerContext()
  const databaseEnabled = computed(() => Boolean(client))
  const loading = ref(false)
  const lastError = ref('')

  async function loadCurrentUser() {
    if (!client) return null
    const { data } = await client.auth.getUser()
    const user = data.user
    const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You'
    playerContext.currentUserId.value = user?.id || null
    playerContext.currentUserName.value = displayName
    return user
  }

  async function loadAssignableUsers() {
    if (!client) return []
    const [{ data: sessionResult }, { data: userResult }] = await Promise.all([
      client.auth.getSession(),
      client.auth.getUser()
    ])
    const session = sessionResult.session
    const currentUser = userResult.user
    if (!session) return []
    const currentUserOption = currentUser
      ? {
          userId: currentUser.id,
          email: currentUser.email || '',
          displayName:
            currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'You',
          isMember: false
        }
      : null
    try {
      const result = await $fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const users = result.users || []
      if (currentUserOption && !users.some((user) => user.userId === currentUserOption.userId)) {
        users.unshift(currentUserOption)
      }
      playerContext.setPeople(
        users,
        playerContext.currentUserId.value,
        playerContext.currentUserName.value
      )
      return users
    } catch (error) {
      lastError.value = error.data?.statusMessage || error.message
      console.warn('Could not load Auth users:', lastError.value)
      const users = currentUserOption ? [currentUserOption] : []
      playerContext.setPeople(
        users,
        playerContext.currentUserId.value,
        playerContext.currentUserName.value
      )
      return users
    }
  }

  async function loadCurrentRound() {
    if (!client) return null
    loading.value = true
    lastError.value = ''
    try {
      await loadCurrentUser()
      const { data, error } = await client
        .from('weeks')
        .select('*, bets(*, bet_selections(*, matches(provider_match_id, home_team, away_team)))')
        .order('week', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      const users = await loadAssignableUsers()
      const value = data ? toUiWeek(data, users) : null
      playerContext.setPeople(
        value?.members || [],
        playerContext.currentUserId.value,
        playerContext.currentUserName.value
      )
      return value
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not load the current week from Supabase:', error.message)
      return null
    } finally {
      loading.value = false
    }
  }

  async function loadRounds() {
    if (!client) return []
    loading.value = true
    lastError.value = ''
    try {
      await loadCurrentUser()
      const { data, error } = await client
        .from('weeks')
        .select('*, bets(*, bet_selections(*, matches(provider_match_id, home_team, away_team)))')
        .order('week', { ascending: false })
      if (error) throw error
      const users = await loadAssignableUsers()
      const rounds = (data || []).map((round) => toUiWeek(round, users))
      playerContext.setPeople(
        rounds[0]?.members || [],
        playerContext.currentUserId.value,
        playerContext.currentUserName.value
      )
      return rounds
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not load league history from Supabase:', error.message)
      return []
    } finally {
      loading.value = false
    }
  }

  async function saveBetToDatabase({ roundId, bettorId, bet, legs, matches }) {
    if (!client || !roundId || !bettorId) return false
    loading.value = true
    try {
      const combinedOdds = legs.reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
      const payload = {
        week_id: roundId,
        bettor_id: bettorId,
        bet_type: bet.type,
        stake: bet.stake,
        combined_odds: combinedOdds,
        status: bet.status || 'pending'
      }
      const { data: savedBet, error: betError } = await client
        .from('bets')
        .upsert(payload, { onConflict: 'week_id,bettor_id' })
        .select('id')
        .single()
      if (betError) throw betError
      const matchRows = legs.map((leg, index) => {
        const source = matches[index]
        const label = String(leg.match || 'Unlinked match')
        const manualId = `manual-${index}-${label}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        const [home, away] = label.split(/\s+v(?:s)?\.?\s+/i)
        return {
          provider: source?.provider || 'manual',
          provider_match_id: leg.matchId || source?.id || manualId,
          home_team: source?.home || home || label,
          away_team: source?.away || away || 'Selection',
          home_score: source?.homeScore ?? null,
          away_score: source?.awayScore ?? null,
          status: source?.status || 'scheduled',
          minute: source?.minute || null
        }
      })
      const { data: savedMatches, error: matchError } = await client
        .from('matches')
        .upsert(matchRows, { onConflict: 'provider,provider_match_id' })
        .select('id, provider_match_id')
      if (matchError) throw matchError
      const matchIds = Object.fromEntries(
        savedMatches.map((match) => [match.provider_match_id, match.id])
      )
      await client.from('bet_selections').delete().eq('bet_id', savedBet.id)
      const selectionRows = legs
        .map((leg, index) => {
          const label = String(leg.match || 'Unlinked match')
          const manualId = `manual-${index}-${label}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
          return {
            bet_id: savedBet.id,
            match_id: matchIds[leg.matchId || matches[index]?.id || manualId],
            market: toDatabaseMarket(leg.market),
            pick: leg.pick,
            odds: Number(leg.odds),
            status: leg.status || 'pending'
          }
        })
        .filter((selection) => selection.match_id)
      const { data: savedSelections, error: selectionError } = await client
        .from('bet_selections')
        .insert(selectionRows)
        .select('id')
      if (selectionError) throw selectionError
      return {
        betId: savedBet.id,
        selectionIds: (savedSelections || []).map((selection) => selection.id)
      }
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not save the bet to Supabase:', error.message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function settleBetInDatabase({ betId, selectionStatuses, stake, combinedOdds }) {
    const statuses = selectionStatuses.map((selection) => selection.status)
    const overallStatus = statuses.some((status) => status === 'lost')
      ? 'lost'
      : statuses.length > 0 && statuses.every((status) => status === 'won')
        ? 'won'
        : 'pending'
    const actualReturn =
      overallStatus === 'won'
        ? Number(stake) * Number(combinedOdds)
        : overallStatus === 'lost'
          ? 0
          : null
    if (!client || !betId) return { status: overallStatus, actualReturn }
    loading.value = true
    try {
      for (const selection of selectionStatuses) {
        const { error } = await client
          .from('bet_selections')
          .update({ status: selection.status })
          .eq('id', selection.id)
        if (error) throw error
      }
      const { error: betError } = await client
        .from('bets')
        .update({ status: overallStatus, actual_return: actualReturn })
        .eq('id', betId)
      if (betError) throw betError
      return { status: overallStatus, actualReturn }
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not settle the bet in Supabase:', error.message)
      return null
    } finally {
      loading.value = false
    }
  }

  async function createInitialWeek(details = {}) {
    if (!client) return null
    loading.value = true
    try {
      const { data: userResult, error: userError } = await client.auth.getUser()
      if (userError || !userResult.user) throw userError || new Error('You need to sign in first.')
      const user = userResult.user
      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'You'
      const deadline = details.deadline
        ? new Date(details.deadline).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const stake = Number(details.stake) || 20
      const title = details.title || 'First Premier League week'
      const weekId = crypto.randomUUID()
      const { error: weekError } = await client.from('weeks').insert({
        id: weekId,
        week: 1,
        title,
        bettor_id: user.id,
        stake,
        deadline,
        status: 'in_progress'
      })
      if (weekError) throw weekError
      playerContext.setPeople(
        [{ userId: user.id, displayName, role: 'player' }],
        user.id,
        displayName
      )
      return toUiWeek(
        {
          id: weekId,
          week: 1,
          title,
          bettor_id: user.id,
          stake,
          deadline,
          status: 'in_progress',
          bets: []
        },
        [{ userId: user.id, displayName }]
      )
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not create the first week:', error.message)
      return null
    } finally {
      loading.value = false
    }
  }

  async function createWeek({ week, title, bettorId, stake, deadline }) {
    if (!client) return null
    loading.value = true
    try {
      const { data, error } = await client
        .from('weeks')
        .insert({
          week,
          title,
          bettor_id: bettorId,
          stake,
          deadline,
          status: 'in_progress'
        })
        .select('*')
        .single()
      if (error) throw error
      const users = await loadAssignableUsers()
      return toUiWeek({ ...data, bets: [] }, users)
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not create the new week:', error.message)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteWeek(weekId) {
    if (!client || !weekId) return false
    loading.value = true
    try {
      const { error } = await client.from('weeks').delete().eq('id', weekId)
      if (error) throw error
      return true
    } catch (error) {
      lastError.value = error.message
      console.warn('Could not delete the week:', error.message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateWeek(weekId, changes) {
    if (!client || !weekId) return false
    const { error } = await client.from('weeks').update(changes).eq('id', weekId)
    if (error) {
      lastError.value = error.message
      return false
    }
    return true
  }

  return {
    databaseEnabled,
    loading,
    lastError,
    loadCurrentRound,
    loadRounds,
    loadAssignableUsers,
    saveBetToDatabase,
    settleBetInDatabase,
    createInitialWeek,
    createWeek,
    updateWeek,
    deleteWeek
  }
}
