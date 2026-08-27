<script setup>
const route = useRoute()
const showShell = computed(() => route.path !== '/login' && !route.path.startsWith('/invite'))
</script>
<template>
  <AppShell v-if="showShell"><NuxtPage /></AppShell>
  <NuxtPage v-else />
</template>
