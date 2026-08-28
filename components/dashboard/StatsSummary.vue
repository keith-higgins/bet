<script setup>
defineProps({
  totalProfitLoss: { type: Number, default: 0 },
  bestWeekProfit: { type: Number, default: 0 },
  currentBettor: { type: String, default: 'No week yet' },
  loading: Boolean,
  money: { type: Function, required: true }
})
</script>

<template>
  <section class="stats-grid" aria-label="League summary">
    <article class="stat-card dark-card">
      <div class="stat-top"><span>Profit / loss</span></div>
      <LoadingSpinner v-if="loading" label="Loading…" small />
      <strong
        v-else
        class="big-number"
        :class="{ positive: totalProfitLoss > 0, loss: totalProfitLoss < 0 }"
      >
        {{ money(totalProfitLoss) }}
      </strong>
      <div class="stat-foot"><span>Settled bets</span></div>
    </article>
    <article class="stat-card">
      <div class="stat-top"><span>Best week profit</span></div>
      <LoadingSpinner v-if="loading" label="Loading…" small />
      <strong v-else class="big-number positive">{{ money(bestWeekProfit) }}</strong>
      <div class="stat-foot"><span>Highest settled profit</span></div>
    </article>
    <article class="stat-card">
      <div class="stat-top"><span>Current week</span></div>
      <LoadingSpinner v-if="loading" label="Loading…" small />
      <strong v-else class="big-number">{{ currentBettor }}</strong>
      <div class="stat-foot"><span>Assigned bettor</span></div>
    </article>
  </section>
</template>

<style scoped>
.big-number.positive {
  color: #169f72;
}
</style>
