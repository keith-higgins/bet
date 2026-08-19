<script setup>
const route = useRoute()
const showSidebar = computed(() => route.path !== '/login' && !route.path.startsWith('/invite'))
</script>
<template><AppSidebar v-if="showSidebar"/><NuxtPage/></template>
