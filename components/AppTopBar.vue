<script setup>
const route = useRoute()
const { currentUserName } = usePlayerContext()
const { liveCount, upcomingCount } = useLiveStatus()
const { weekTitle, isSettled, totalWeeksRecorded, playerCount } = useAppMeta()

function initials(name) {
  return (name || 'Player')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const pageTitle = computed(() => {
  if (route.path === '/live') return 'Match centre'
  if (route.path === '/history') return 'History'
  if (route.path === '/league') return 'League table'
  if (route.path === '/admin') return 'Manage'
  if (route.path === '/challenges') return 'Manage weeks'
  if (route.path === '/account') return 'Account'
  // Home, the bet builder, and anything else week-scoped show the current
  // round's title — or the previous round's, since that's still the latest
  // one on record until a new week is created.
  return weekTitle.value || 'Overview'
})

const pageMeta = computed(() => {
  if (route.path === '/live') return `${liveCount.value} LIVE · ${upcomingCount.value} UPCOMING`
  if (route.path === '/history') return `${totalWeeksRecorded.value} WEEKS RECORDED`
  if (route.path === '/league') return `${playerCount.value} PLAYERS`
  if (route.path === '/admin') return 'ADMIN TOOLS'
  if (route.path === '/account') return currentUserName.value.toUpperCase()
  if (!weekTitle.value) return ''
  return isSettled.value ? 'SETTLED' : ''
})
</script>

<template>
  <header class="topbar">
    <div class="topbar-mark" aria-hidden="true" />
    <div class="topbar-titles">
      <strong>{{ pageTitle }}</strong>
      <small v-if="pageMeta">{{ pageMeta }}</small>
    </div>
    <button v-if="liveCount > 0" type="button" class="live-pill" @click="navigateTo('/live')">
      <span class="live-dot" />{{ liveCount }} LIVE
    </button>
    <NuxtLink class="avatar" to="/account" aria-label="Open account">{{
      initials(currentUserName)
    }}</NuxtLink>
  </header>
</template>
