export function useDashboard() {
  const { players, currentUserId, currentUserName } = usePlayerContext()
  const {
    databaseEnabled,
    lastError,
    loadRounds,
    loadAssignableUsers,
    saveBetToDatabase,
    settleBetInDatabase,
    updateWeek,
    createInitialWeek,
    createWeek,
    deleteWeek
  } = useChallengeData()

  const round = ref({
    id: null,
    week: 1,
    title: 'Your first Premier League week',
    dates: 'No round created yet',
    bets: []
  })
  const previousRounds = ref([])
  const assignableUsers = ref([])
  const bet = ref({
    id: null,
    bettorId: null,
    type: 'Accumulator',
    stake: 20,
    status: 'pending',
    selections: []
  })
  const legs = ref([{ match: '', market: 'Match result', pick: '', odds: 1.5, status: 'pending' }])
  const stake = ref(20)
  const loading = ref(false)
  const toast = ref('')
  let toastTimer

  const settled = computed(() => ['won', 'lost'].includes(bet.value.status))
  const combinedOdds = computed(() =>
    legs.value.reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
  )
  const potentialReturn = computed(() => Number(stake.value || 0) * combinedOdds.value)
  const allRounds = computed(() => [round.value, ...previousRounds.value])
  const totalProfitLoss = computed(() =>
    allRounds.value.reduce(
      (total, item) =>
        total +
        (item.bets || []).reduce(
          (roundTotal, currentBet) =>
            roundTotal +
            (['won', 'lost'].includes(currentBet.status)
              ? Number(currentBet.actualReturn || 0) - Number(currentBet.stake || 0)
              : 0),
          0
        ),
      0
    )
  )
  const bestWeekProfit = computed(() =>
    Math.max(
      0,
      ...allRounds.value.flatMap((item) =>
        (item.bets || [])
          .filter((currentBet) => ['won', 'lost'].includes(currentBet.status))
          .map((currentBet) => Number(currentBet.actualReturn || 0) - Number(currentBet.stake || 0))
      )
    )
  )
  const playersForWeek = computed(() =>
    round.value.members?.length ? round.value.members : players.value
  )
  const nextBettorId = computed(
    () =>
      assignableUsers.value.find((member) => member.userId !== round.value.bettorId)?.userId ||
      round.value.members?.find((member) => member.userId !== round.value.bettorId)?.userId ||
      round.value.bettorId ||
      ''
  )
  const currentBettorName = computed(() => round.value.bettor || 'No week yet')
  const canManageCurrentBet = computed(
    () =>
      !currentUserId.value || !round.value.bettorId || currentUserId.value === round.value.bettorId
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
        const memberBets = allBets.filter((item) => item.bettorId === member.userId)
        const won = memberBets.filter((item) => item.status === 'won').length
        const lost = memberBets.filter((item) => item.status === 'lost').length
        const netProfit = memberBets.reduce(
          (total, item) =>
            total +
            (['won', 'lost'].includes(item.status)
              ? Number(item.actualReturn || 0) - Number(item.stake || 0)
              : 0),
          0
        )
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
      bettorId: value.bettorId || currentUserId.value,
      bettor: value.bettor || currentUserName.value || 'Player',
      type: 'Accumulator',
      stake: value.stake,
      status: 'pending',
      selections: []
    }
    stake.value = value.stake
    legs.value = [{ match: '', market: 'Match result', pick: '', odds: 1.5, status: 'pending' }]
  }

  function applyRound(value) {
    if (!value) return
    round.value = value
    const assignedBet = value.bets?.find((item) => item.bettorId === value.bettorId)
    if (assignedBet) {
      bet.value = assignedBet
      stake.value = bet.value.stake
      legs.value = bet.value.selections.map((item) => ({
        id: item.id,
        match: item.match || item.matchId || '',
        market: item.market,
        pick: item.pick,
        odds: item.odds,
        status: item.status || 'pending'
      }))
    } else {
      resetBet(value)
    }
  }

  async function loadDashboard() {
    if (!databaseEnabled.value) return
    const rounds = await loadRounds()
    assignableUsers.value = await loadAssignableUsers()
    const value = rounds[0]
    if (value) {
      applyRound(value)
      previousRounds.value = rounds.slice(1)
    }
  }

  async function saveBet(payload) {
    loading.value = true
    const nextLegs = payload.legs.map((leg, index) => ({
      ...leg,
      odds: Number(leg.odds),
      status: 'pending'
    }))
    bet.value = {
      ...bet.value,
      stake: Number(payload.stake),
      selections: nextLegs.map((leg, index) => ({
        id: bet.value.selections[index]?.id || `leg-${index}`,
        matchId: leg.match,
        market: leg.market,
        pick: leg.pick,
        odds: leg.odds,
        status: 'pending'
      }))
    }
    stake.value = Number(payload.stake)
    legs.value = nextLegs
    round.value = {
      ...round.value,
      bets: [...round.value.bets.filter((item) => item.bettorId !== bet.value.bettorId), bet.value]
    }
    const saved = await saveBetToDatabase({
      roundId: round.value.id,
      bettorId: bet.value.bettorId,
      bet: bet.value,
      legs: nextLegs,
      matches: []
    })
    if (saved && typeof saved === 'object') {
      bet.value = {
        ...bet.value,
        id: saved.betId || bet.value.id,
        selections: bet.value.selections.map((selection, index) => ({
          ...selection,
          id: saved.selectionIds?.[index] || selection.id
        }))
      }
      legs.value = nextLegs.map((leg, index) => ({
        ...leg,
        id: saved.selectionIds?.[index] || leg.id
      }))
      round.value = {
        ...round.value,
        bets: [
          ...round.value.bets.filter((item) => item.bettorId !== bet.value.bettorId),
          bet.value
        ]
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
      status: result.status === 'pending' ? round.value.status : 'settled',
      bets: [...round.value.bets.filter((item) => item.bettorId !== bet.value.bettorId), bet.value]
    }
    let roundUpdateFailed = false
    if (result.status !== 'pending' && databaseEnabled.value) {
      roundUpdateFailed = !(await updateWeek(round.value.id, { status: 'settled' }))
    }
    notify(
      roundUpdateFailed
        ? `Bet settled as ${result.status}, but the round status could not be saved.`
        : result.status === 'pending'
          ? 'Bet updated. Resolve every selection to settle the round.'
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
      bettorId: details.bettorId || nextBettorId.value,
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
    totalProfitLoss,
    bestWeekProfit,
    currentUserName,
    players: playersForWeek,
    assignableUsers,
    currentBettorName,
    canManageCurrentBet,
    nextBettorId,
    leaders,
    money,
    loadDashboard,
    saveBet,
    settleBet,
    addNewWeek,
    removeCurrentWeek
  }
}
