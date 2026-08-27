export function useLiveScores() {
  const scores = ref({})
  const loading = ref(false)
  const error = ref('')
  let timer

  async function refresh(matches = []) {
    const eligible = matches.filter((match) => {
      if (!match.matchId || match.provider !== 'thesportsdb' || !match.startsAt) return false
      if (scores.value[match.matchId]?.status?.toLowerCase().includes('finished')) return false
      return new Date(match.startsAt).getTime() <= Date.now()
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
