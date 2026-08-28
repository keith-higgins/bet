<script setup>
defineProps({
  label: { type: String, default: 'Loading…' },
  inline: Boolean,
  small: Boolean
})
</script>

<template>
  <span class="loading-indicator" :class="{ inline, small }" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true" />
    <span v-if="label">{{ label }}</span>
  </span>
</template>
