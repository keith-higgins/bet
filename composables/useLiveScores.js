export function useLiveScores() {
  const scores = ref({})
  const loading = ref(false)
  const error = ref('')
  let timer

  async function refresh(matches = []) {
    const eligible = matches.filter((match) => {
      if (!match.matchId || match.provider !== 'espn') return false
      // Already finished per the persisted DB record — the score is final, and ESPN
      // drops old fixtures from its near-term window after a few days, so re-polling
      // a long-settled match would just 404 for no benefit.
      if (String(match.matchStatus || '').toLowerCase().includes('finished')) return false
      const existing = scores.value[match.matchId]
      // Always fetch once, even for a match that hasn't kicked off — that first call is
      // also how the team crest images get hydrated. After that, only keep polling
      // matches that are actually underway; a finished or not-yet-started match doesn't
      // need re-fetching every interval.
      if (!existing) return true
      if (existing.status?.toLowerCase().includes('finished')) return false
      return !match.startsAt || new Date(match.startsAt).getTime() <= Date.now()
    })
    if (!eligible.length) return
    loading.value = true
    try {
      const updates = await Promise.allSettled(
        eligible.map(async (match) => {
          const result = await $fetch(`/api/football/event/${match.matchId}`)
          return [match.matchId, result]
        })
      )
      const fulfilled = updates
        .filter((update) => update.status === 'fulfilled')
        .map((update) => update.value)
      if (fulfilled.length) scores.value = { ...scores.value, ...Object.fromEntries(fulfilled) }
      // A single fixture ESPN no longer has (fallen out of its near-term window, or a
      // transient miss) is expected and shouldn't block the rest of the poll or scare
      // the user with a raw "Fixture not found." banner — just leave it showing
      // whatever score it already had.
      error.value = ''
    } finally {
      loading.value = false
    }
  }

  function start(matches) {
    if (!import.meta.client) return
    refresh(matches)
    timer = window.setInterval(() => refresh(matches), 120000)
  }

  function stop() {
    if (!import.meta.client) return
    window.clearInterval(timer)
    timer = undefined
  }

  onBeforeUnmount(stop)

  return { scores, loading, error, start, stop, refresh }
}
