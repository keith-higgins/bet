<script setup>
const { loadRounds, loading, lastError } = useChallengeData()
const rounds = ref([])
const money = (value) => `€ ${Number(value || 0).toFixed(2)}`
onMounted(async () => {
  rounds.value = await loadRounds()
})
</script>

<template>
  <div class="screen-pad">
    <div class="screen-header">
      <p class="screen-overline">{{ rounds.length }} WEEKS &middot; EVERY SELECTION</p>
      <h2 class="screen-title">History</h2>
    </div>
    <LoadingSpinner v-if="loading" label="Loading Premier League history…" />
    <div v-else-if="lastError" class="builder-error" role="alert">{{ lastError }}</div>
    <HistoryList v-else :rounds="rounds" :money="money" />
  </div>
</template>
