<script setup>
const props = defineProps({
  matches: { type: Array, default: () => [] },
  limit: { type: Number, default: 0 },
  detailed: Boolean
})
const { scores, loading, error, start, stop } = useLiveScores()
const { liveCount, upcomingCount } = useLiveStatus()

const trackedMatches = computed(() =>
  props.matches.map((match) => ({
    ...match,
    ...(scores.value[match.matchId] || {}),
    betStatus: match.status || 'pending',
    matchStatus: scores.value[match.matchId]?.status || match.matchStatus || 'scheduled'
  }))
)
const visibleMatches = computed(() =>
  props.limit ? trackedMatches.value.slice(0, props.limit) : trackedMatches.value
)

function isLive(match) {
  const value = String(match.matchStatus || '').toLowerCase()
  return value.includes('progress') || value.includes('live')
}
function isUpcoming(match) {
  return !match.startsAt || new Date(match.startsAt) > new Date()
}
function stateLine(match) {
  const value = String(match.matchStatus || '').toLowerCase()
  if (isUpcoming(match)) return `STARTS ${kickoff(match)}`.toUpperCase()
  if (value.includes('finished')) return 'FULL TIME'
  if (isLive(match)) return (match.minute ? `${match.minute} · ` : '') + 'IN PLAY'
  return (match.matchStatus || 'SCHEDULED').toUpperCase()
}
function scoreLine(match) {
  if (match.homeScore == null || match.awayScore == null) return '—'
  return `${match.homeScore} – ${match.awayScore}`
}
function kickoff(match) {
  return match.startsAt
    ? new Date(match.startsAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'unavailable'
}
function rowClass(match) {
  if (isUpcoming(match)) return ''
  if (isLive(match)) return 'live'
  return 'pending'
}
function pickStatus(match) {
  if (match.betStatus === 'won') return { label: 'ON TRACK', tone: 'won' }
  if (match.betStatus === 'lost') return { label: 'LOST', tone: 'lost' }
  if (isUpcoming(match)) return { label: 'UPCOMING', tone: 'upcoming' }
  return { label: 'PENDING', tone: 'pending' }
}

watch(
  trackedMatches,
  (matches) => {
    liveCount.value = matches.filter(isLive).length
    upcomingCount.value = matches.filter(isUpcoming).length
  },
  { immediate: true, deep: true }
)

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
  <div v-if="visibleMatches.length" class="live-list">
    <article
      v-for="match in visibleMatches"
      :key="match.matchId"
      class="match-preview-row"
      :class="[rowClass(match), { detailed }]"
    >
      <template v-if="detailed">
        <div class="match-detailed-top">
          <div class="match-preview-main">
            <strong>{{ match.home }} v {{ match.away }}</strong>
            <small>{{ stateLine(match) }}</small>
          </div>
          <span class="match-preview-score">{{ scoreLine(match) }}</span>
        </div>
        <div class="match-detailed-foot">
          <span v-if="match.pick" class="match-pick"
            ><template v-if="match.market">{{ match.market }} &middot; </template>Pick:
            {{ match.pick }}</span
          >
          <span v-else class="match-pick">&nbsp;</span>
          <span class="status-pill" :class="pickStatus(match).tone">{{
            pickStatus(match).label
          }}</span>
        </div>
      </template>
      <template v-else>
        <div class="match-preview-main">
          <strong>{{ match.home }} v {{ match.away }}</strong>
          <small
            ><template v-if="match.market">{{ match.market }} &middot; </template
            >{{ stateLine(match) }}</small
          >
        </div>
        <span class="match-preview-score">{{ scoreLine(match) }}</span>
      </template>
    </article>
    <p v-if="error" class="error-copy">{{ error }}</p>
    <p v-else-if="loading" class="error-copy" style="color: var(--muted)">Updating…</p>
  </div>
</template>

<style scoped>
.live-list {
  display: grid;
  gap: 8px;
}
.error-copy {
  margin: 6px 0 0;
  color: var(--coral);
  font-size: 11px;
}
</style>
