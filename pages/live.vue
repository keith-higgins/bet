<script setup>
const dashboard = reactive(useDashboard())

const accaLegs = computed(() =>
  dashboard.legs.map((leg) => ({
    ...leg,
    dotClass: leg.status === 'won' ? 'won' : leg.status === 'lost' ? 'lost' : 'pending'
  }))
)
const landedCount = computed(() => accaLegs.value.filter((leg) => leg.status === 'won').length)
const toGoCount = computed(
  () =>
    accaLegs.value.length -
    landedCount.value -
    accaLegs.value.filter((leg) => leg.status === 'lost').length
)
</script>

<template>
  <div class="screen-pad">
    <div class="screen-header">
      <p class="screen-overline">MATCH CENTRE &middot; REFRESHES EVERY 2 MINS</p>
      <h2 class="screen-title">Live scores</h2>
    </div>

    <div v-if="accaLegs.length" class="acca-status-card">
      <div>
        <p class="builder-field-label" style="margin-bottom: 7px">ACCA STATUS</p>
        <strong>{{ landedCount }} landed &middot; {{ toGoCount }} to go</strong>
      </div>
      <div class="acca-status-pips">
        <span v-for="(leg, index) in accaLegs" :key="index" :class="leg.dotClass" />
      </div>
    </div>

    <LiveScoresCard :matches="dashboard.trackedMatches" detailed />
    <div
      v-if="!dashboard.trackedMatches.length"
      class="acca-empty"
      style="border: 1px solid var(--line); border-radius: 18px"
    >
      <span>No matches to track yet. Add selections to your acca first.</span>
    </div>
  </div>
</template>
