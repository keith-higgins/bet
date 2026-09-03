<script setup>
const { players } = usePlayerContext()
const {
  loadRounds,
  updateWeek,
  deleteWeek,
  createWeek,
  createInitialWeek,
  loadAssignableUsers,
  saveBetToDatabase,
  settleBetInDatabase,
  loading,
  lastError
} = useChallengeData()
// This page manages weeks directly through useChallengeData rather than the
// shared useDashboard() state that Home/TopBar/League/Manage read from, so
// every mutation here also has to refresh that shared state — otherwise it
// stays stale until a hard reload.
const dashboard = reactive(useDashboard())
const rounds = ref([])
const assignableUsers = ref([])
const creating = ref(false)
const editingBet = ref(null)
const settlingBet = ref(null)
const notice = ref('')
const money = (value) => `€ ${Number(value || 0).toFixed(2)}`
const refresh = async () => {
  rounds.value = await loadRounds()
  assignableUsers.value = await loadAssignableUsers()
  await dashboard.loadDashboard()
}
async function save(item, changes) {
  const ok = await updateWeek(item.id, changes)
  notice.value = ok ? 'Week updated.' : lastError.value
  if (ok) await refresh()
}
async function saveBet(betDetails) {
  if (!editingBet.value) return
  const item = rounds.value.find((round) =>
    round.bets?.some((bet) => bet.id === editingBet.value.id)
  )
  if (!item) return
  const saved = await saveBetToDatabase({
    roundId: item.id,
    bettorId: editingBet.value.bettorId || item.bettorId,
    bet: editingBet.value,
    legs: betDetails.legs,
    matches: []
  })
  notice.value = saved ? 'Bet updated.' : lastError.value
  if (saved) {
    editingBet.value = null
    await refresh()
  }
}
function startSettlement(item, bet) {
  settlingBet.value = { item, bet }
}
async function saveSettlement(statuses) {
  if (!settlingBet.value) return
  const { item, bet } = settlingBet.value
  const combinedOdds = bet.selections.reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
  const result = await settleBetInDatabase({
    betId: bet.id,
    selectionStatuses: statuses,
    stake: bet.stake,
    combinedOdds
  })
  if (!result) {
    notice.value = lastError.value
    return
  }
  const weekUpdateFailed =
    result.status !== 'pending' && !(await updateWeek(item.id, { status: 'settled' }))
  settlingBet.value = null
  notice.value = weekUpdateFailed
    ? `Bet settled as ${result.status}, but the week status could not be saved.`
    : `Bet settled as ${result.status}.`
  await refresh()
}
async function remove(item) {
  if (!confirm(`Delete Week ${item.week} and all bets?`)) return
  if (await deleteWeek(item.id)) {
    await refresh()
    notice.value = 'Week deleted.'
  } else notice.value = lastError.value
}
async function create(details) {
  const current = rounds.value[0]
  if (!current) {
    const item = await createInitialWeek(details)
    if (item) {
      creating.value = false
      await refresh()
      notice.value = 'Week created.'
    } else notice.value = lastError.value
    return
  }
  const nextBettorId =
    assignableUsers.value.find((member) => member.userId !== current.bettorId)?.userId ||
    current?.members?.find((member) => member.userId !== current.bettorId)?.userId ||
    current?.bettorId
  const item = await createWeek({
    week: (current?.week || 0) + 1,
    title: details.title || `Premier League week ${(current?.week || 0) + 1}`,
    bettorId: details.bettorId || nextBettorId,
    stake: Number(details.stake) || 20,
    deadline: details.deadline
      ? new Date(details.deadline).toISOString()
      : new Date(Date.now() + 604800000).toISOString()
  })
  if (item) {
    creating.value = false
    await refresh()
    notice.value = 'Week created.'
  } else notice.value = lastError.value
}
onMounted(refresh)
</script>

<template>
  <div>
    <div class="page-wrap manage-page">
      <NuxtLink class="back-link" to="/admin">← Back to manage</NuxtLink>
      <section class="page-heading inline-heading">
        <div>
          <p class="overline">ADMINISTRATION</p>
          <h1>Manage weeks</h1>
          <p class="subheading">Create, edit, and remove weekly turns and bets.</p>
        </div>
        <button class="primary-button" type="button" @click="creating = true">＋ New week</button>
      </section>
      <p v-if="notice" class="auth-success">{{ notice }}</p>
      <div class="challenge-list">
        <ManagedChallengeCard
          v-for="item in rounds"
          :key="item.id"
          :item="item"
          :money="money"
          :users="assignableUsers"
          @save="(changes) => save(item, changes)"
          @edit-bet="editingBet = $event"
          @settle-bet="startSettlement(item, $event)"
          @remove="remove(item)"
        />
        <LoadingSpinner v-if="loading && !rounds.length" label="Loading weeks…" />
        <div v-else-if="!rounds.length" class="empty-state">
          <strong>No weeks yet</strong><span>Create the first Premier League week.</span>
        </div>
      </div>
    </div>
    <NewRoundFlow
      :open="creating"
      :loading="loading"
      :members="rounds[0]?.members || players"
      :users="assignableUsers"
      :default-bettor-id="
        rounds[0]?.members?.find((member) => member.userId !== rounds[0]?.bettorId)?.userId ||
        rounds[0]?.bettorId
      "
      @close="creating = false"
      @save="create"
    />
    <BetEntryFlow
      :open="Boolean(editingBet)"
      :initial-stake="editingBet?.stake || 20"
      :initial-legs="editingBet?.selections || []"
      :loading="loading"
      :money="money"
      @close="editingBet = null"
      @save="saveBet"
    />
    <SettlementFlow
      :open="Boolean(settlingBet)"
      :legs="settlingBet?.bet.selections || []"
      :loading="loading"
      @close="settlingBet = null"
      @save="saveSettlement"
    />
  </div>
</template>
