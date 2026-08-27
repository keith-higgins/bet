<script setup>
defineProps({
  rounds: { type: Array, default: () => [] },
  money: { type: Function, required: true }
})
const expanded = ref(null)
function toggle(id) {
  expanded.value = expanded.value === id ? null : id
}
function outcome(item) {
  const bet = item.bets?.[0]
  const bettor = bet?.bettor || item.bettor || 'Player'
  if (bet?.status === 'won') return `${bettor} won`
  if (bet?.status === 'lost') return `${bettor} lost`
  return bet ? `${bettor} · ${bet.status}` : 'No bet recorded'
}
</script>

<template>
  <div class="history-list">
    <article v-for="item in rounds" :key="item.id" class="history-card">
      <button
        class="history-card-button"
        type="button"
        :aria-expanded="expanded === item.id"
        @click="toggle(item.id)"
      >
        <span class="week-number">{{ item.week }}</span
        ><span class="history-card-main"
          ><strong>{{ item.title }}</strong
          ><small>{{ item.dates }} · {{ money(item.stake) }} stake</small></span
        ><span class="history-outcome" :class="item.bets?.[0]?.status || 'waiting'">{{
          outcome(item)
        }}</span>
        <span class="history-card-result"
          ><span class="result-pill" :class="item.bets?.[0]?.status || 'waiting'">{{
            item.bets?.[0]?.status || 'No bet'
          }}</span
          ><b>{{
            item.bets?.[0]?.actualReturn == null
              ? '—'
              : money(Number(item.bets[0].actualReturn) - Number(item.bets[0].stake))
          }}</b></span
        ><span class="row-arrow" aria-hidden="true">{{ expanded === item.id ? '⌃' : '⌄' }}</span>
      </button>
      <div v-if="expanded === item.id" class="history-details">
        <div v-if="item.bets?.[0]?.selections?.length">
          <div v-for="(leg, index) in item.bets[0].selections" :key="index" class="history-leg">
            <span>{{ index + 1 }}</span>
            <div>
              <strong>{{ leg.match || `Leg ${index + 1}` }}</strong
              ><small>{{ leg.market }} · {{ leg.pick }}</small>
            </div>
            <b :class="leg.status">{{ leg.status }}</b>
          </div>
        </div>
        <p v-else class="empty-copy">No bet was recorded for this week.</p>
      </div>
    </article>
    <div v-if="!rounds.length" class="empty-state">
      <span class="empty-icon">◌</span><strong>No league history yet</strong
      ><span>Settled weeks will appear here.</span>
    </div>
  </div>
</template>

<style scoped>
.history-outcome {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font: 600 11px 'Space Grotesk';
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-outcome.won {
  color: #169f72;
}

.history-outcome.lost {
  color: #e46870;
}
</style>
