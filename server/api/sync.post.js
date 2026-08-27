import { getFootballProvider } from '~/lib/football/provider.js'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ids = String(query.ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const matches = await getFootballProvider().getLiveMatches(ids)
  return { ok: true, provider: 'thesportsdb', matches, syncedAt: new Date().toISOString() }
})
