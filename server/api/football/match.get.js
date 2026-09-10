import { getFootballProvider } from '~/lib/football/provider.js'

// Targeted lookup for when the caller already knows exactly which match it wants (a
// selected Paddy Power fixture, or a parsed screenshot) — much cheaper than searching
// the full fixtures list, see FootballProvider.findFixture.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  try {
    const fixture = await getFootballProvider().findFixture({
      home: String(query.home || ''),
      away: String(query.away || ''),
      startsAt: query.startsAt ? String(query.startsAt) : ''
    })
    return { fixture }
  } catch (error) {
    console.warn('Football match lookup failed', {
      status: error?.statusCode || error?.response?.status,
      message: error?.message,
      data: error?.data
    })
    throw createError({ statusCode: 502, statusMessage: 'Unable to load the football match.' })
  }
})
