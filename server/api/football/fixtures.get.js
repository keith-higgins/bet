import { getFootballProvider } from '~/lib/football/provider.js'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  try {
    return { fixtures: await getFootballProvider().getFixtures(String(query.q || '')) }
  } catch (error) {
    console.warn('Football fixtures lookup failed', {
      status: error?.statusCode || error?.response?.status,
      message: error?.message,
      data: error?.data
    })
    throw createError({ statusCode: 502, statusMessage: 'Unable to load football fixtures.' })
  }
})
