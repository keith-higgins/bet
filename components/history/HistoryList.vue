<script setup>
const props = defineProps({
  rounds: { type: Array, default: () => [] },
  money: { type: Function, required: true }
})

const { totalWeeksRecorded } = useAppMeta()
const expanded = ref(null)
const expandedBets = ref({})
const statusFilter = ref('All')

const allBets = computed(() => props.rounds.flatMap((round) => round.bets || []))
const settledBets = computed(() =>
  allBets.value.filter((bet) => bet.status === 'won' || bet.status === 'lost')
)
const totalStaked = computed(() =>
  settledBets.value.reduce((total, bet) => total + Number(bet.stake || 0), 0)
)
const totalReturned = computed(() =>
  settledBets.value.reduce((total, bet) => total + Number(bet.actualReturn || 0), 0)
)
const netResult = computed(() => totalReturned.value - totalStaked.value)
const record = computed(() => ({
  won: settledBets.value.filter((bet) => bet.status === 'won').length,
  lost: settledBets.value.filter((bet) => bet.status === 'lost').length
}))

watchEffect(() => {
  totalWeeksRecorded.value = props.rounds.length
})

function toggle(id) {
  expanded.value = expanded.value === id ? null : id
}

function toggleBet(id) {
  expandedBets.value = { ...expandedBets.value, [id]: !expandedBets.value[id] }
}

function profit(bet) {
  if (bet.status !== 'won' && bet.status !== 'lost') return null
  return Number(bet.actualReturn || 0) - Number(bet.stake || 0)
}

function filteredBets(round) {
  return (round.bets || []).filter((bet) => {
    if (statusFilter.value === 'All') return true
    return bet.status === statusFilter.value.toLowerCase()
  })
}

function weekProfit(round) {
  return filteredBets(round).reduce((total, bet) => total + Number(profit(bet) || 0), 0)
}

const visibleRounds = computed(() => {
  const filtered = props.rounds.filter((round) =>
    statusFilter.value === 'All' ? true : filteredBets(round).length > 0
  )
  return [...filtered].sort((first, second) => Number(second.week || 0) - Number(first.week || 0))
})

function summaryStatus(bets) {
  if (!bets.length) return 'NO BET'
  if (bets.every((bet) => bet.status === 'pending')) return 'AWAITING RESULT'
  if (bets.some((bet) => bet.status === 'pending')) return 'IN PROGRESS'
  if (bets.some((bet) => bet.status === 'lost')) return 'LOST'
  return 'WON'
}

function scoreLabel(leg) {
  if (leg.homeScore == null || leg.awayScore == null) return 'score pending'
  return String(leg.homeScore) + '-' + String(leg.awayScore)
}

function signedMoney(value) {
  return (value > 0 ? '+' : value < 0 ? '−' : '') + props.money(Math.abs(value))
}

function weekSummaryLabel(item) {
  const bets = filteredBets(item)
  if (bets.length <= 1) {
    const bet = bets[0]
    return `${bet?.bettor || 'Player'} · ${item.dates} · ${props.money(item.stake)} stake · ${
      (bet?.selections || []).length
    } legs`
  }
  const totalStake = bets.reduce((total, bet) => total + Number(bet.stake || 0), 0)
  const totalLegs = bets.reduce((total, bet) => total + (bet.selections || []).length, 0)
  return `${bets.length} bets · ${item.dates} · ${props.money(totalStake)} staked · ${totalLegs} legs`
}

function betStatusLabel(bet) {
  if (bet.status === 'won') return 'WON'
  if (bet.status === 'lost') return 'LOST'
  return (bet.selections || []).length ? 'PENDING' : 'NO BET'
}
</script>

<template>
  <section v-if="rounds.length">
    <div class="history-summary-grid">
      <article class="history-tile">
        <span class="builder-field-label">SETTLED BETS</span>
        <strong>{{ settledBets.length }}</strong>
        <small>{{ record.won }} won &middot; {{ record.lost }} lost</small>
      </article>
      <article class="history-tile">
        <span class="builder-field-label">TOTAL STAKED</span>
        <strong>{{ money(totalStaked) }}</strong>
        <small>Settled only</small>
      </article>
      <article class="history-tile">
        <span class="builder-field-label">RETURNED</span>
        <strong>{{ money(totalReturned) }}</strong>
        <small>Winning returns</small>
      </article>
      <article class="history-tile net" :class="{ negative: netResult < 0 }">
        <span class="builder-field-label">NET RESULT</span>
        <strong>{{ signedMoney(netResult) }}</strong>
        <small>Returns &minus; stakes</small>
      </article>
    </div>

    <div class="history-filters">
      <button
        v-for="status in ['All', 'Won', 'Lost', 'Pending']"
        :key="status"
        type="button"
        class="pill-chip history-filter-chip"
        :class="{ active: statusFilter === status }"
        @click="statusFilter = status"
      >
        {{ status }}
      </button>
    </div>

    <div v-if="visibleRounds.length" class="history-weeks">
      <article v-for="item in visibleRounds" :key="item.id || item.week" class="history-week-card">
        <button
          class="history-week-summary"
          type="button"
          :aria-expanded="expanded === item.id"
          @click="toggle(item.id)"
        >
          <span class="history-week-main">
            <strong>{{ item.title }}</strong>
            <small>{{ weekSummaryLabel(item) }}</small>
          </span>
          <span class="history-week-result">
            <strong
              :class="{ 'result-won': weekProfit(item) > 0, 'result-lost': weekProfit(item) < 0 }"
              >{{ signedMoney(weekProfit(item)) }}</strong
            >
            <small>{{ summaryStatus(filteredBets(item)) }}</small>
          </span>
        </button>

        <div v-if="expanded === item.id" class="history-week-body">
          <div v-if="filteredBets(item).length" class="history-bet-groups">
            <div
              v-for="bet in filteredBets(item)"
              :key="bet.id || bet.bettorId"
              class="history-bet-group"
            >
              <button
                type="button"
                class="history-bet-summary"
                :aria-expanded="Boolean(expandedBets[bet.id])"
                @click="toggleBet(bet.id)"
              >
                <span class="history-bet-main">
                  <strong>{{ bet.bettor || 'Player' }}</strong>
                  <small
                    >{{ money(bet.stake) }} stake &middot; {{ (bet.selections || []).length }} legs</small
                  >
                </span>
                <span class="history-bet-status" :class="`status-${bet.status || 'pending'}`">{{
                  betStatusLabel(bet)
                }}</span>
              </button>
              <div v-if="expandedBets[bet.id]">
                <p v-if="bet.type === 'BetBuilder'" class="history-bet-match">
                  {{ (bet.selections || [])[0]?.match || 'Unlinked match' }}
                </p>
                <div
                  v-for="(leg, index) in bet.selections || []"
                  :key="leg.id || index"
                  class="history-leg-row"
                >
                  <span class="history-leg-index">{{ index + 1 }}</span>
                  <div class="history-leg-main">
                    <div v-if="bet.type !== 'BetBuilder' && leg.home && leg.away" class="match-scoreline">
                      <div class="team-side home"><strong>{{ leg.home }}</strong></div>
                      <span class="match-preview-score">{{ scoreLabel(leg) }}</span>
                      <div class="team-side away"><strong>{{ leg.away }}</strong></div>
                    </div>
                    <div v-else-if="bet.type !== 'BetBuilder'">{{ leg.match || 'Unlinked match' }}</div>
                    <small>{{ leg.market }} &middot; {{ leg.pick }}</small>
                  </div>
                  <span class="history-leg-status" :class="`status-${leg.status || 'pending'}`">{{
                    (leg.status || 'pending').toUpperCase()
                  }}</span>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="acca-empty" style="padding: 16px">No bets match the selected filter.</p>
        </div>
      </article>
    </div>
    <div v-else class="acca-empty">
      <span>No matching history. Try a different filter.</span>
    </div>
  </section>

  <div v-else class="acca-empty">
    <span>No history yet. Completed weeks will appear here once the challenge gets underway.</span>
  </div>
</template>
