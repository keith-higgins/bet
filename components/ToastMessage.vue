<script setup>
defineProps({ message: { type: String, default: '' } })
</script>

<template>
  <div v-if="message" class="toast" role="status">✓ {{ message }}</div>
</template>
