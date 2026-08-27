import { getFootballProvider } from '~/lib/football/provider.js'

export default defineEventHandler(async (event) => {
  try {
    const fixture = await getFootballProvider().getMatchResult(getRouterParam(event, 'id'))
    if (!fixture) throw createError({ statusCode: 404, statusMessage: 'Fixture not found.' })
    return fixture
  } catch (error) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 502, statusMessage: 'Unable to load the fixture.' })
  }
})
