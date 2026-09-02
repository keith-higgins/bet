<script setup>
const { loadRounds, loading, lastError } = useChallengeData()
const rounds = ref([])
const money = (value) => `€ ${Number(value || 0).toFixed(2)}`
onMounted(async () => {
  rounds.value = await loadRounds()
})
</script>

<template>
  <div class="page-wrap history-page">
    <section class="page-heading">
      <p class="overline">YOUR CHALLENGE</p>
      <h1>History</h1>
      <p class="subheading">Season totals, useful filters, and every selection in one place.</p>
    </section>
    <LoadingSpinner v-if="loading" label="Loading Premier League history…" />
    <div v-else-if="lastError" class="error-panel" role="alert">{{ lastError }}</div>
    <HistoryList v-else :rounds="rounds" :money="money" />
  </div>
</template>
