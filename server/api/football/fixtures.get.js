import { getFootballProvider } from '~/lib/football/provider.js'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  try {
    return { fixtures: await getFootballProvider().getFixtures(String(query.q || '')) }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Unable to load football fixtures.' })
  }
})
