<script setup>
const route = useRoute()
const { isAdmin } = usePlayerContext()
const manageActive = computed(() => route.path === '/admin' || route.path === '/challenges')
</script>

<template>
  <nav class="mobile-bottom-nav" aria-label="Mobile navigation">
    <NuxtLink to="/" exact-active-class="active"
      ><span class="mobile-nav-icon">⌂</span><span>Home</span></NuxtLink
    >
    <NuxtLink v-if="isAdmin" to="/admin" :class="{ active: manageActive }"
      ><span class="mobile-nav-icon">＋</span><span>Manage</span></NuxtLink
    >
    <NuxtLink to="/account" exact-active-class="active"
      ><span class="mobile-nav-icon">●</span><span>Account</span></NuxtLink
    >
  </nav>
</template>
