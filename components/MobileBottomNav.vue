<script setup>
const route = useRoute()
</script>

<template>
  <nav class="mobile-bottom-nav" aria-label="Mobile navigation">
    <NuxtLink to="/" exact-active-class="active"
      ><span class="mobile-nav-icon" /><span>Home</span></NuxtLink
    >
    <NuxtLink to="/live" :class="{ active: route.path === '/live' }"
      ><span class="mobile-nav-icon icon-live" /><span>Live</span></NuxtLink
    >
    <NuxtLink to="/history" :class="{ active: route.path === '/history' }"
      ><span class="mobile-nav-icon icon-history" /><span>History</span></NuxtLink
    >
    <NuxtLink to="/league" :class="{ active: route.path === '/league' }"
      ><span class="mobile-nav-icon icon-table" /><span>Table</span></NuxtLink
    >
  </nav>
</template>
