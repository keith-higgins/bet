<script setup>
defineProps({
  personalProfitLoss: { type: Number, default: 0 },
  personalBestReturn: { type: Number, default: 0 },
  personalRecord: {
    type: Object,
    default: () => ({ won: 0, lost: 0 })
  },
  loading: Boolean,
  money: { type: Function, required: true }
})
</script>

<template>
  <section class="personal-stats" aria-label="Personal performance">
    <div class="section-heading personal-stats-heading">
      <div>
        <p class="overline">YOUR PERFORMANCE</p>
        <h2>Personal summary</h2>
      </div>
    </div>
    <div class="stats-grid">
      <article class="stat-card dark-card">
        <div class="stat-top"><span>Your profit / loss</span></div>
        <LoadingSpinner v-if="loading" label="Loading…" small />
        <strong
          v-else
          class="big-number"
          :class="{ positive: personalProfitLoss > 0, loss: personalProfitLoss < 0 }"
        >
          {{ money(personalProfitLoss) }}
        </strong>
        <div class="stat-foot"><span>Settled bets</span></div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Your best return</span></div>
        <LoadingSpinner v-if="loading" label="Loading…" small />
        <strong v-else class="big-number positive">{{ money(personalBestReturn) }}</strong>
        <div class="stat-foot"><span>Highest settled return</span></div>
      </article>
      <article class="stat-card record-card">
        <div class="stat-top"><span>Your record</span></div>
        <LoadingSpinner v-if="loading" label="Loading…" small />
        <strong v-else class="big-number"
          >{{ personalRecord.won }} - {{ personalRecord.lost }}</strong
        >
        <div class="stat-foot"><span>Won · lost bets</span></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.personal-stats-heading {
  margin-bottom: 14px;
}

.big-number.positive {
  color: #169f72;
}
</style>
