export function useDashboard() {
  const { players, currentUserId, currentUserName, isAdmin } = usePlayerContext()
  const {
    databaseEnabled,
    lastError,
    loadRounds,
    loadAssignableUsers,
    saveBetToDatabase,
    settleBetInDatabase,
    createInitialWeek,
    createWeek,
    deleteWeek
  } = useChallengeData()

  const round = useState('dashboard-round', () => ({
    id: null,
    week: 1,
    title: 'Your first Premier League week',
    dates: 'No round created yet',
    bets: []
  }))
  const previousRounds = useState('dashboard-previous-rounds', () => [])
  const assignableUsers = useState('dashboard-assignable-users', () => [])
  const activeBetId = useState('dashboard-active-bet-id', () => null)
  const bet = useState('dashboard-bet', () => ({
    id: null,
    bettorId: null,
    type: 'Accumulator',
    stake: 20,
    status: 'pending',
    selections: []
  }))
  const legs = useState('dashboard-legs', () => [
    { match: '', market: 'Match result', pick: '', odds: 1.5, status: 'pending' }
  ])
  const stake = useState('dashboard-stake', () => 20)
  const loading = useState('dashboard-loading', () => databaseEnabled.value)
  const toast = useState('dashboard-toast', () => '')
  let toastTimer

  const settled = computed(() => ['won', 'lost'].includes(bet.value.status))
  const combinedOdds = computed(() =>
    legs.value.reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
  )
  const potentialReturn = computed(() => Number(stake.value || 0) * combinedOdds.value)
  const allRounds = computed(() => [round.value, ...previousRounds.value])
  const userBets = computed(() =>
    round.value.bets.filter(
      (currentBet) => !currentUserId.value || currentBet.bettorId === currentUserId.value
    )
  )
  // Groups a player's bets by week so scoring reflects whether that week's
  // bets netted positive overall, not whether any single bet won or lost.
  function weeklyResultsFor(playerId) {
    return allRounds.value
      .map((item) => {
        const weekBets = (item.bets || []).filter((currentBet) => currentBet.bettorId === playerId)
        if (!weekBets.length) return null
        const pending = weekBets.some((currentBet) => !['won', 'lost'].includes(currentBet.status))
        const net = weekBets.reduce(
          (total, currentBet) =>
            total +
            (['won', 'lost'].includes(currentBet.status)
              ? Number(currentBet.actualReturn || 0) - Number(currentBet.stake || 0)
              : 0),
          0
        )
        return { week: item.week, status: pending ? 'pending' : net > 0 ? 'won' : 'lost', net }
      })
      .filter(Boolean)
  }
  const personalWeeklyResults = computed(() =>
    weeklyResultsFor(currentUserId.value || bet.value.bettorId)
  )
  const personalSettledWeeks = computed(() =>
    personalWeeklyResults.value.filter((result) => result.status !== 'pending')
  )
  const personalBets = computed(() => {
    const playerId = currentUserId.value || bet.value.bettorId
    return allRounds.value
      .flatMap((item) => item.bets || [])
      .filter((currentBet) => !playerId || currentBet.bettorId === playerId)
  })
  const personalSettledBets = computed(() =>
    personalBets.value.filter((currentBet) => ['won', 'lost'].includes(currentBet.status))
  )
  const personalProfitLoss = computed(() =>
    personalSettledBets.value.reduce(
      (total, currentBet) =>
        total + Number(currentBet.actualReturn || 0) - Number(currentBet.stake || 0),
      0
    )
  )
  const personalBestReturn = computed(() =>
    Math.max(0, ...personalSettledWeeks.value.map((result) => result.net))
  )
  const personalRecord = computed(() => ({
    won: personalSettledWeeks.value.filter((result) => result.status === 'won').length,
    lost: personalSettledWeeks.value.filter((result) => result.status === 'lost').length
  }))
  const personalStaked = computed(() =>
    personalSettledBets.value.reduce(
      (total, currentBet) => total + Number(currentBet.stake || 0),
      0
    )
  )
  const personalForm = computed(() =>
    [...personalWeeklyResults.value].reverse().slice(-8).map((result) => result.status)
  )
  const playersForWeek = computed(() =>
    round.value.members?.length ? round.value.members : players.value
  )
  const trackedMatches = computed(() => {
    const matches = round.value.bets.flatMap((currentBet) => currentBet.selections || [])
    return [
      ...new Map(
        matches.filter((match) => match.matchId).map((match) => [match.matchId, match])
      ).values()
    ]
  })
  const canManageCurrentBet = computed(
    () => !databaseEnabled.value || Boolean(round.value.id)
  )
  const leaders = computed(() => {
    const allBets = allRounds.value.flatMap((item) => item.bets || [])
    const knownMembers = [
      ...players.value,
      ...assignableUsers.value,
      ...allRounds.value.flatMap((item) => item.members || []),
      ...allBets.map((item) => ({ userId: item.bettorId, displayName: item.bettor }))
    ]
      .filter((member) => member?.userId)
      .reduce((members, member) => {
        if (!members.some((item) => item.userId === member.userId)) members.push(member)
        return members
      }, [])

    return knownMembers
      .map((member) => {
        const weeklyResults = weeklyResultsFor(member.userId).filter(
          (result) => result.status !== 'pending'
        )
        const won = weeklyResults.filter((result) => result.status === 'won').length
        const lost = weeklyResults.filter((result) => result.status === 'lost').length
        const netProfit = weeklyResults.reduce((total, result) => total + result.net, 0)
        return {
          userId: member.userId,
          name: member.displayName || 'Player',
          initials: (member.displayName || 'P')
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          record: `${won} - ${lost}`,
          profit: netProfit
        }
      })
      .sort(
        (left, right) =>
          right.profit - left.profit ||
          right.record.localeCompare(left.record) ||
          left.name.localeCompare(right.name)
      )
  })
  const personalTablePosition = computed(() => {
    const total = leaders.value.length
    const rank = leaders.value.findIndex((leader) => leader.userId === currentUserId.value) + 1
    return { rank: rank || total, total }
  })
  const money = (value) => `€ ${Number(value || 0).toFixed(2)}`

  function notify(message) {
    toast.value = message
    clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toast.value = ''
    }, 3500)
  }

  function resetBet(value) {
    bet.value = {
      id: null,
      bettorId: currentUserId.value || value.bettorId,
      bettor: currentUserName.value || value.bettor || 'Player',
      type: 'Accumulator',
      stake: value.stake,
      status: 'pending',
      selections: []
    }
    stake.value = value.stake
    legs.value = [{ match: '', market: 'Match result', pick: '', odds: 1.5, status: 'pending' }]
    activeBetId.value = null
  }

  function loadBetIntoState(value, matchedBet) {
    bet.value = matchedBet
    stake.value = matchedBet.stake
    legs.value = matchedBet.selections.map((item) => ({
      id: item.id,
      match: item.match || item.matchId || '',
      matchId: item.matchId || '',
      provider: item.provider || '',
      startsAt: item.startsAt || '',
      home: item.home || '',
      away: item.away || '',
      market: item.market,
      pick: item.pick,
      odds: item.odds,
      status: item.status || 'pending'
    }))
    activeBetId.value = matchedBet.id
  }

  function selectBet(id) {
    const matchedBet = round.value.bets.find((item) => item.id === id)
    if (matchedBet) loadBetIntoState(round.value, matchedBet)
  }

  function startNewBet() {
    resetBet(round.value)
  }

  function applyRound(value) {
    if (!value) return
    round.value = value
    const matchedBet =
      value.bets?.find((item) => item.id === activeBetId.value) ||
      value.bets?.find((item) => item.bettorId === currentUserId.value)
    if (matchedBet) {
      loadBetIntoState(value, matchedBet)
    } else {
      resetBet(value)
    }
  }

  async function loadDashboard() {
    if (!databaseEnabled.value) return
    loading.value = true
    try {
      const rounds = await loadRounds()
      assignableUsers.value = await loadAssignableUsers()
      const value = rounds[0]
      if (value) {
        applyRound(value)
        previousRounds.value = rounds.slice(1)
      }
    } finally {
      loading.value = false
    }
  }

  async function saveBet(payload) {
    if (databaseEnabled.value && !round.value.id) {
      notify('Create this week before adding a bet.')
      return false
    }
    loading.value = true
    const nextLegs = payload.legs.map((leg) => ({
      ...leg,
      odds: Number(leg.odds),
      status: 'pending'
    }))
    const nextBet = {
      ...bet.value,
      stake: Number(payload.stake),
      selections: nextLegs.map((leg, index) => ({
        id: bet.value.selections[index]?.id || `leg-${index}`,
        matchId: leg.matchId || leg.match,
        provider: leg.provider || '',
        startsAt: leg.startsAt || '',
        home: leg.home || '',
        away: leg.away || '',
        match: leg.match,
        market: leg.market,
        pick: leg.pick,
        odds: leg.odds,
        status: 'pending'
      }))
    }
    const saved = await saveBetToDatabase({
      roundId: round.value.id,
      bettorId: nextBet.bettorId,
      betId: nextBet.id,
      bet: nextBet,
      legs: nextLegs,
      matches: []
    })
    if (saved && typeof saved === 'object') {
      nextBet.id = saved.betId || nextBet.id
      nextBet.selections = nextBet.selections.map((selection, index) => ({
        ...selection,
        id: saved.selectionIds?.[index] || selection.id
      }))
    }
    // Only commit to local state once the bet is actually persisted (or there's
    // no backend to persist to) — otherwise a failed save left the UI showing a
    // bet that was never saved.
    if (saved || !databaseEnabled.value) {
      const existed = round.value.bets.some((item) => item.id === nextBet.id)
      bet.value = nextBet
      stake.value = Number(payload.stake)
      legs.value = nextLegs.map((leg, index) => ({
        ...leg,
        id: nextBet.selections[index]?.id || leg.id
      }))
      activeBetId.value = nextBet.id
      round.value = {
        ...round.value,
        bets: existed
          ? round.value.bets.map((item) => (item.id === nextBet.id ? nextBet : item))
          : [...round.value.bets, nextBet]
      }
    }
    loading.value = false
    notify(
      saved
        ? 'Bet saved.'
        : databaseEnabled.value
          ? `Could not save: ${lastError.value}`
          : 'Bet saved locally.'
    )
    return saved || !databaseEnabled.value
  }

  async function settleBet(selectionStatuses) {
    const result = await settleBetInDatabase({
      betId: bet.value.id,
      selectionStatuses,
      stake: stake.value,
      combinedOdds: combinedOdds.value
    })
    if (!result) {
      notify(`Could not settle: ${lastError.value}`)
      return false
    }
    bet.value = {
      ...bet.value,
      status: result.status,
      actualReturn: result.actualReturn,
      selections: bet.value.selections.map((item, index) => ({
        ...item,
        status: selectionStatuses[index].status
      }))
    }
    legs.value = legs.value.map((leg, index) => ({
      ...leg,
      status: selectionStatuses[index].status
    }))
    round.value = {
      ...round.value,
      bets: round.value.bets.map((item) => (item.id === bet.value.id ? bet.value : item))
    }
    notify(
      result.status === 'pending'
        ? 'Bet updated. Resolve every selection to settle it.'
        : `Bet settled as ${result.status}.`
    )
    return true
  }

  async function addNewWeek(details) {
    loading.value = true
    if (!round.value.id) {
      const value = await createInitialWeek(details)
      if (value) {
        applyRound(value)
        notify('Week created.')
      } else notify(`Could not create week: ${lastError.value}`)
      loading.value = false
      return value
    }
    const value = await createWeek({
      week: round.value.week + 1,
      title: details.title || `Premier League week ${round.value.week + 1}`,
      stake: Number(details.stake) || 20,
      deadline: details.deadline
        ? new Date(details.deadline).toISOString()
        : new Date(Date.now() + 7 * 86400000).toISOString()
    })
    if (value) {
      previousRounds.value.unshift(round.value)
      round.value = value
      resetBet(value)
      notify('Week created.')
    } else notify(`Could not create week: ${lastError.value}`)
    loading.value = false
    return value
  }

  async function removeCurrentWeek() {
    if (!window.confirm('Delete this week and its bets and selections? This cannot be undone.'))
      return false
    const deleted = await deleteWeek(round.value.id)
    if (deleted) {
      window.location.href = '/'
      return true
    }
    notify(`Could not delete week: ${lastError.value}`)
    return false
  }

  onBeforeUnmount(() => clearTimeout(toastTimer))

  return {
    databaseEnabled,
    lastError,
    round,
    previousRounds,
    bet,
    legs,
    stake,
    loading,
    toast,
    settled,
    combinedOdds,
    potentialReturn,
    personalProfitLoss,
    personalBestReturn,
    personalRecord,
    personalStaked,
    personalForm,
    personalTablePosition,
    currentUserId,
    currentUserName,
    players: playersForWeek,
    assignableUsers,
    userBets,
    activeBetId,
    trackedMatches,
    canManageCurrentBet,
    isAdmin,
    leaders,
    money,
    loadDashboard,
    saveBet,
    settleBet,
    selectBet,
    startNewBet,
    addNewWeek,
    removeCurrentWeek
  }
}
