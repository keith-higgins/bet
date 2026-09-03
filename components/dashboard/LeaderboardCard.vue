<script setup>
const props = defineProps({
  leaders: { type: Array, default: () => [] },
  limit: { type: Number, default: 3 },
  money: { type: Function, required: true }
})
const visibleLeaders = computed(() => props.leaders.slice(0, props.limit))
</script>

<template>
  <div class="acca-card">
    <div v-for="(leader, index) in visibleLeaders" :key="leader.userId" class="league-preview-row">
      <span class="league-preview-rank">{{ index + 1 }}</span>
      <div class="avatar" :class="index === 0 ? 'purple' : 'yellow'">{{ leader.initials }}</div>
      <span class="league-preview-name">{{ leader.name }}</span>
      <span class="mono-meta">{{ leader.record }}</span>
      <span class="league-preview-profit" :class="{ negative: leader.profit < 0 }">{{
        money(leader.profit)
      }}</span>
    </div>
    <div v-if="!visibleLeaders.length" class="acca-empty">
      <span>No players yet. Invite someone to start the scoreboard.</span>
    </div>
  </div>
</template>
