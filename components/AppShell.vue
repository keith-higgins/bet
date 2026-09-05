<script setup>
const dashboard = reactive(useDashboard())
const { weekTitle, isSettled } = useAppMeta()

onMounted(dashboard.loadDashboard)

// Local preview mode (no Supabase configured) has no way to create a real
// round, so its in-memory placeholder round always stands in for one — same
// rule TurnHeroCard uses to decide whether a round "exists".
watch(
  () => [dashboard.round.title, dashboard.round.status],
  () => {
    const hasRound = Boolean(dashboard.round.id) || !dashboard.databaseEnabled
    weekTitle.value = hasRound ? dashboard.round.title : ''
    isSettled.value = hasRound && dashboard.round.status === 'settled'
  },
  { immediate: true }
)
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="app-main">
      <AppTopBar />
      <main class="app-page"><slot /></main>
    </div>
    <MobileBottomNav />
  </div>
</template>
