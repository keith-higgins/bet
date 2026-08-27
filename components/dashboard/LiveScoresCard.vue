<script setup>
const props = defineProps({ matches: { type: Array, default: () => [] } })
const { scores, loading, error, start, stop } = useLiveScores()
const trackedMatches = computed(() =>
  props.matches.map((match) => ({ ...match, ...(scores.value[match.matchId] || {}) }))
)
function status(match) {
  if (match.status?.toLowerCase().includes('finished')) return 'Finished'
  if (match.status?.toLowerCase().includes('progress')) return match.minute || 'Live'
  return match.status || 'Upcoming'
}
function kickoff(match) {
  return match.startsAt
    ? new Date(match.startsAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Kickoff unavailable'
}
watch(
  () => props.matches,
  (matches) => {
    stop()
    if (matches.length) start(matches)
  },
  { immediate: true }
)
</script>

<template>
  <section v-if="trackedMatches.length" class="live-scores-card">
    <div class="section-heading">
      <div>
        <p class="overline">MATCH CENTRE</p>
        <h2>Live scores</h2>
      </div>
      <span class="live-refresh">{{ loading ? 'Updating…' : 'Refreshes every 2 mins' }}</span>
    </div>
    <div class="live-score-list">
      <article v-for="match in trackedMatches" :key="match.matchId" class="live-score-row">
        <div>
          <strong>{{ match.home }} v {{ match.away }}</strong>
          <small>{{
            match.startsAt && new Date(match.startsAt) <= new Date()
              ? status(match)
              : `Starts ${kickoff(match)}`
          }}</small>
        </div>
        <strong v-if="match.homeScore != null && match.awayScore != null" class="live-score">
          {{ match.homeScore }} - {{ match.awayScore }}
        </strong>
        <span v-else class="live-score pending">—</span>
      </article>
    </div>
    <p v-if="error" class="error-copy">{{ error }}</p>
  </section>
</template>

<style scoped>
.live-scores-card {
  margin: 18px 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}

.live-refresh {
  color: var(--muted);
  font-size: 10px;
}

.live-score-list {
  display: grid;
  gap: 8px;
}

.live-score-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 0;
  border-top: 1px solid var(--line);
}

.live-score-row strong,
.live-score-row small {
  display: block;
}

.live-score-row strong {
  font-size: 12px;
}

.live-score-row small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.live-score {
  flex: 0 0 auto;
  font: 600 18px 'Space Grotesk';
}

.live-score.pending {
  color: var(--muted);
}

.error-copy {
  margin: 10px 0 0;
  color: var(--red);
  font-size: 11px;
}
</style>
