export function useLiveScores() {
  const scores = ref({})
  const loading = ref(false)
  const error = ref('')
  let timer

  async function refresh(matches = []) {
    const eligible = matches.filter((match) => {
      if (!match.matchId || match.provider !== 'espn') return false
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
    error.value = ''
    try {
      const updates = await Promise.all(
        eligible.map(async (match) => {
          const result = await $fetch(`/api/football/event/${match.matchId}`)
          return [match.matchId, result]
        })
      )
      scores.value = { ...scores.value, ...Object.fromEntries(updates) }
    } catch (refreshError) {
      error.value = refreshError.data?.statusMessage || 'Live scores are temporarily unavailable.'
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
