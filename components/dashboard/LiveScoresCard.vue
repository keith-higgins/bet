<script setup>
const props = defineProps({ matches: { type: Array, default: () => [] } })
const { scores, loading, error, start, stop } = useLiveScores()
const trackedMatches = computed(() =>
  props.matches.map((match) => ({
    ...match,
    ...(scores.value[match.matchId] || {}),
    betStatus: match.status || 'pending',
    matchStatus: scores.value[match.matchId]?.status || match.matchStatus || 'scheduled'
  }))
)
function fixtureStatus(match) {
  const value = String(match.matchStatus || '').toLowerCase()
  if (value.includes('finished')) return 'Finished'
  if (value.includes('progress') || value.includes('live')) return match.minute || 'Live'
  return value && value !== 'scheduled' ? match.matchStatus : 'Upcoming'
}
function betStatusLabel(value) {
  if (value === 'won') return 'Won'
  if (value === 'lost') return 'Lost'
  return 'Pending'
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
      <article
        v-for="match in trackedMatches"
        :key="match.matchId"
        class="live-score-row"
        :class="match.betStatus"
      >
        <div class="live-match-main">
          <div class="live-match-heading">
            <strong>{{ match.home }} v {{ match.away }}</strong>
            <span class="live-bet-status" :class="match.betStatus">
              {{ betStatusLabel(match.betStatus) }}
            </span>
          </div>
          <div class="live-match-meta">
            <small>{{
              match.startsAt && new Date(match.startsAt) <= new Date()
                ? fixtureStatus(match)
                : `Starts ${kickoff(match)}`
            }}</small>
            <small v-if="match.pick" class="live-pick">Pick: {{ match.pick }}</small>
          </div>
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

.live-match-main {
  min-width: 0;
  flex: 1;
}

.live-match-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.live-match-heading strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.live-match-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 4px;
}

.live-match-meta small {
  display: block;
  color: var(--muted);
  font-size: 10px;
}

.live-pick {
  color: #6651ca !important;
  font-weight: 500;
}

.live-bet-status {
  flex: none;
  padding: 4px 6px;
  border-radius: 10px;
  background: #fff6d8;
  color: #bd8b08;
  font: 9px 'DM Mono';
}

.live-score-row.won {
  border-left: 3px solid #bde8d7;
  background: #fbfffd;
  padding-left: 8px;
}

.live-score-row.lost {
  border-left: 3px solid #f0c1c4;
  background: #fffafa;
  padding-left: 8px;
}

.live-score-row.pending {
  border-left: 3px solid #f4dfa0;
  padding-left: 8px;
}

.live-bet-status.won {
  background: #e7f8f2;
  color: #129c6e;
}

.live-bet-status.lost {
  background: #fff0ef;
  color: #e46870;
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
