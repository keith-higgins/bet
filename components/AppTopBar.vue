<script setup>
const route = useRoute()
const pageTitle = computed(() => {
  if (route.path === '/history') return 'History'
  if (route.path === '/admin') return 'Manage'
  if (route.path === '/challenges') return 'Manage weeks'
  if (route.path === '/account') return 'Account'
  return 'Overview'
})
</script>

<template>
  <header class="topbar">
    <div class="breadcrumbs">
      <span>Premier League</span><b>/</b><strong>{{ pageTitle }}</strong>
    </div>
    <div class="top-actions">
      <span class="sync-status"><i class="live-dot" />Shared league</span
      ><NuxtLink class="avatar purple" to="/account" aria-label="Open account">ME</NuxtLink>
    </div>
  </header>
</template>
