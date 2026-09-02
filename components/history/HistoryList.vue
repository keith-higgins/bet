<script setup>
const props = defineProps({
  rounds: { type: Array, default: () => [] },
  money: { type: Function, required: true }
})

const expanded = ref(null)
const statusFilter = ref('all')
const playerFilter = ref('all')
const sortBy = ref('newest')

const allBets = computed(() => props.rounds.flatMap((round) => round.bets || []))
const players = computed(() => {
  const uniquePlayers = new Map()
  allBets.value.forEach((bet) => {
    if (bet.bettorId && !uniquePlayers.has(bet.bettorId)) {
      uniquePlayers.set(bet.bettorId, bet.bettor || 'Player')
    }
  })
  return [...uniquePlayers].map(([id, name]) => ({ id, name }))
})

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

function toggle(id) {
  expanded.value = expanded.value === id ? null : id
}

function profit(bet) {
  if (bet.status !== 'won' && bet.status !== 'lost') return null
  return Number(bet.actualReturn || 0) - Number(bet.stake || 0)
}

function filteredBets(round) {
  return (round.bets || []).filter((bet) => {
    const matchesStatus = statusFilter.value === 'all' || bet.status === statusFilter.value
    const matchesPlayer = playerFilter.value === 'all' || bet.bettorId === playerFilter.value
    return matchesStatus && matchesPlayer
  })
}

function weekProfit(round) {
  return filteredBets(round).reduce((total, bet) => total + Number(profit(bet) || 0), 0)
}

const visibleRounds = computed(() => {
  const filtered = props.rounds.filter((round) =>
    statusFilter.value === 'all' && playerFilter.value === 'all'
      ? true
      : filteredBets(round).length > 0
  )
  return [...filtered].sort((first, second) => {
    if (sortBy.value === 'profit-high') return weekProfit(second) - weekProfit(first)
    if (sortBy.value === 'profit-low') return weekProfit(first) - weekProfit(second)
    return Number(second.week || 0) - Number(first.week || 0)
  })
})

function summaryStatus(bets) {
  if (!bets.length) return 'No bet'
  if (bets.every((bet) => bet.status === 'pending')) return 'Awaiting result'
  if (bets.some((bet) => bet.status === 'pending')) return 'In progress'
  if (bets.some((bet) => bet.status === 'lost')) return 'Lost'
  return 'Won'
}

function outcomeLabel(bets) {
  if (!bets.length) return 'No matching bets'
  if (bets.length === 1) return bets[0].bettor || 'Player'
  return bets.length + ' bets recorded'
}

function betCountLabel(bets) {
  if (!bets.length) return 'No bet'
  return bets.length + ' bet' + (bets.length === 1 ? '' : 's')
}

function scoreLabel(leg) {
  if (leg.homeScore == null || leg.awayScore == null) return 'Score pending'
  return String(leg.homeScore) + ' - ' + String(leg.awayScore)
}

function signedMoney(value) {
  return (value > 0 ? '+' : '') + props.money(value)
}

function returnSummary(bet) {
  if (bet.actualReturn == null) return 'Return pending'
  const result = profit(bet)
  return (
    'Returned ' +
    props.money(bet.actualReturn) +
    ' · ' +
    (result >= 0 ? '+' : '') +
    props.money(result)
  )
}

function resetFilters() {
  statusFilter.value = 'all'
  playerFilter.value = 'all'
  sortBy.value = 'newest'
}
</script>

<template>
  <section v-if="rounds.length" class="history-content">
    <div class="history-summary" aria-label="History summary">
      <article class="history-summary-card">
        <span class="history-summary-label">Settled bets</span>
        <strong>{{ settledBets.length }}</strong>
        <small>{{ record.won }} won · {{ record.lost }} lost</small>
      </article>
      <article class="history-summary-card">
        <span class="history-summary-label">Total staked</span>
        <strong>{{ money(totalStaked) }}</strong>
        <small>Settled bets only</small>
      </article>
      <article class="history-summary-card">
        <span class="history-summary-label">Total returned</span>
        <strong>{{ money(totalReturned) }}</strong>
        <small>Including winning returns</small>
      </article>
      <article
        class="history-summary-card"
        :class="{ 'is-positive': netResult > 0, 'is-negative': netResult < 0 }"
      >
        <span class="history-summary-label">Net result</span>
        <strong>{{ signedMoney(netResult) }}</strong>
        <small>Returns minus stakes</small>
      </article>
    </div>

    <div class="history-toolbar" aria-label="Filter history">
      <label>
        <span>Result</span>
        <select v-model="statusFilter">
          <option value="all">All results</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="pending">Pending</option>
        </select>
      </label>
      <label>
        <span>Player</span>
        <select v-model="playerFilter">
          <option value="all">All players</option>
          <option v-for="player in players" :key="player.id" :value="player.id">
            {{ player.name }}
          </option>
        </select>
      </label>
      <label>
        <span>Sort by</span>
        <select v-model="sortBy">
          <option value="newest">Newest first</option>
          <option value="profit-high">Highest profit</option>
          <option value="profit-low">Lowest profit</option>
        </select>
      </label>
      <button
        v-if="statusFilter !== 'all' || playerFilter !== 'all' || sortBy !== 'newest'"
        class="text-button history-reset"
        type="button"
        @click="resetFilters"
      >
        Reset
      </button>
    </div>

    <div v-if="visibleRounds.length" class="history-list">
      <article v-for="item in visibleRounds" :key="item.id || item.week" class="history-card">
        <button
          class="history-card-button"
          type="button"
          :aria-expanded="expanded === item.id"
          @click="toggle(item.id)"
        >
          <span class="history-week-number">W{{ item.week }}</span>
          <span class="history-card-main">
            <strong>{{ item.title || 'Weekly accumulator' }}</strong>
            <small>{{ item.dates }} · {{ money(item.stake) }} base stake</small>
          </span>
          <span class="history-card-outcome">
            <strong>{{ outcomeLabel(filteredBets(item)) }}</strong>
            <small>{{ betCountLabel(filteredBets(item)) }}</small>
          </span>
          <span
            class="status-pill"
            :class="
              'status-' + summaryStatus(filteredBets(item)).toLowerCase().replaceAll(' ', '-')
            "
          >
            {{ summaryStatus(filteredBets(item)) }}
          </span>
          <span
            class="history-card-result"
            :class="{
              'result-positive': weekProfit(item) > 0,
              'result-negative': weekProfit(item) < 0
            }"
          >
            <b>{{ signedMoney(weekProfit(item)) }}</b>
            <small>Net result</small>
          </span>
          <span class="history-chevron" aria-hidden="true">{{
            expanded === item.id ? '⌃' : '⌄'
          }}</span>
        </button>

        <div v-if="expanded === item.id" class="history-details">
          <div v-if="filteredBets(item).length" class="history-bets">
            <section
              v-for="bet in filteredBets(item)"
              :key="bet.id || bet.bettorId"
              class="history-bet"
            >
              <header class="history-bet-header">
                <div>
                  <strong>{{ bet.bettor || 'Player' }} · {{ bet.type }}</strong>
                  <small>{{ money(bet.stake) }} stake · {{ returnSummary(bet) }}</small>
                </div>
                <span class="status-pill" :class="'status-' + bet.status">{{ bet.status }}</span>
              </header>
              <div class="history-legs">
                <div
                  v-for="(leg, index) in bet.selections || []"
                  :key="leg.id || index"
                  class="history-leg"
                >
                  <span class="history-leg-number">{{ index + 1 }}</span>
                  <span class="history-leg-main">
                    <strong>{{ leg.match || 'Unlinked match' }}</strong>
                    <small>{{ leg.market }} · {{ leg.pick }} · {{ scoreLabel(leg) }}</small>
                  </span>
                  <span
                    class="history-leg-status"
                    :class="'status-text-' + (leg.status || 'pending')"
                  >
                    {{ leg.status || 'pending' }}
                  </span>
                </div>
              </div>
            </section>
          </div>
          <p v-else class="history-filter-empty">
            No bets match the selected filters in this week.
          </p>
        </div>
      </article>
    </div>
    <div v-else class="empty-state history-filter-empty-state">
      <strong>No matching history</strong>
      <p>Try changing the player or result filter.</p>
      <button class="secondary-button" type="button" @click="resetFilters">Clear filters</button>
    </div>
  </section>

  <div v-else class="empty-state">
    <strong>No history yet</strong>
    <p>Completed weeks will appear here once the challenge gets underway.</p>
  </div>
</template>

<style scoped>
.history-content {
  display: grid;
  gap: 18px;
}

.history-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.history-summary-card {
  display: grid;
  gap: 5px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}

.history-summary-card strong {
  font-size: 1.25rem;
  letter-spacing: -0.03em;
}

.history-summary-card small {
  color: var(--muted);
  font-size: 0.72rem;
}

.history-summary-label {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.history-summary-card.is-positive strong {
  color: var(--green, #16794a);
}

.history-summary-card.is-negative strong {
  color: var(--red, #bd3d46);
}

.history-week-number {
  display: grid;
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  place-items: center;
  border-radius: 5px;
  background: #f1effe;
  color: var(--purple);
  font: 500 11px 'DM Mono';
}

.history-card-outcome {
  display: grid;
  width: 110px;
  gap: 4px;
}

.history-card-outcome strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76rem;
}

.history-card-outcome small,
.history-card-result small {
  color: var(--muted);
  font-size: 0.68rem;
}

.history-card-result.result-positive b {
  color: var(--green);
}

.history-card-result.result-negative b {
  color: var(--red);
}

.status-pill {
  display: inline-flex;
  width: max-content;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 3px 7px;
  border-radius: 999px;
  font: 500 0.63rem 'DM Mono';
  text-transform: capitalize;
  white-space: nowrap;
}

.status-won {
  background: #e7f8f2;
  color: #129c6e;
}

.status-lost {
  background: #fff0ef;
  color: #e46870;
}

.status-pending,
.status-awaiting-result,
.status-in-progress {
  background: #f1f3f6;
  color: var(--muted);
}

.status-no-bet {
  background: #f1f3f6;
  color: var(--muted);
}

.history-chevron {
  color: #b4bbc6;
  font-size: 16px;
}

.history-toolbar {
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #f8f9fb;
}

.history-toolbar label {
  display: grid;
  gap: 5px;
  min-width: 145px;
}

.history-toolbar label span {
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.history-toolbar select {
  min-height: 36px;
  padding: 0 30px 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
}

.history-reset {
  min-height: 36px;
  margin-left: auto;
}

.history-bets {
  display: grid;
  gap: 0;
}

.history-bet {
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}

.history-bet:last-child {
  border-bottom: 0;
  padding-bottom: 2px;
}

.history-bet-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.history-bet-header div {
  display: grid;
  gap: 4px;
}

.history-bet-header small {
  color: var(--muted);
}

.history-legs {
  display: grid;
  gap: 6px;
}

.history-leg-number {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  border-radius: 50%;
  background: #e9edf2;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.history-leg > .history-leg-number {
  width: 24px;
  height: 24px;
}

.history-leg > .status-pill {
  width: max-content;
  height: auto;
  min-height: 22px;
}

.history-leg > .history-leg-status {
  display: block;
  width: auto;
  height: auto;
  background: none;
  color: var(--muted);
  font: 500 0.63rem 'DM Mono';
  text-transform: capitalize;
}

.history-leg-status.status-text-won {
  color: var(--green);
}

.history-leg-status.status-text-lost {
  color: var(--red);
}

.history-leg-main {
  display: grid;
  width: auto;
  height: auto;
  flex: 1;
  gap: 3px;
  min-width: 0;
  place-items: initial;
  border-radius: 0;
  background: none;
  color: inherit;
}

.history-leg-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-leg-main small {
  color: var(--muted);
}

.history-details {
  padding-top: 12px;
  background: #f4f6f8;
}

.history-filter-empty {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
}

.history-filter-empty-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
}

.history-filter-empty-state p {
  margin: 0 0 4px;
}

@media (max-width: 800px) {
  .history-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .history-card-outcome {
    display: none;
  }

  .history-card-button {
    align-items: flex-start;
    min-height: 64px;
  }

  .history-card-result {
    flex: 0 0 72px;
    width: 72px;
  }

  .history-details {
    padding-right: 12px;
    padding-left: 12px;
  }

  .history-leg {
    align-items: flex-start;
  }
}

@media (max-width: 520px) {
  .history-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .history-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .history-toolbar label {
    min-width: 0;
  }

  .history-reset {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .history-bet-header {
    display: grid;
  }
}

@media (max-width: 380px) {
  .history-summary-card {
    padding: 13px 10px;
  }

  .history-summary-card strong {
    font-size: 1.08rem;
  }
}
</style>
