<script setup>
const route = useRoute()
const manageActive = computed(() => route.path === '/admin' || route.path === '/challenges')
</script>

<template>
  <aside class="sidebar shared-sidebar">
    <NuxtLink class="brand" to="/" aria-label="The Weekly Punt home">
      <div class="brand-mark" aria-hidden="true"><span /><span /></div>
      <div>
        <strong>the<span>weekly punt</span></strong
        ><small>Premier League betting league</small>
      </div>
    </NuxtLink>
    <div class="side-label">Workspace</div>
    <nav class="main-nav" aria-label="Primary navigation">
      <NuxtLink class="nav-item" to="/" exact-active-class="active"
        ><span class="nav-icon">⌂</span><span>Overview</span></NuxtLink
      >
      <NuxtLink class="nav-item" to="/admin" :class="{ active: manageActive }"
        ><span class="nav-icon">＋</span><span>Manage</span></NuxtLink
      >
      <NuxtLink class="nav-item" to="/account" exact-active-class="active"
        ><span class="nav-icon">●</span><span>Account</span></NuxtLink
      >
    </nav>
    <div class="side-spacer" />
  </aside>
</template>
