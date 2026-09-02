import { competitionPageUrl, eventPageUrl, fetchPage } from '~/lib/paddyPower.js'

export async function fetchPaddyPowerCompetition(competitionId) {
  if (!/^\d+$/.test(String(competitionId))) {
    throw createError({ statusCode: 400, statusMessage: 'competitionId must be numeric.' })
  }

  try {
    const { fetchedAt, matches, raw } = await fetchPage(competitionPageUrl(competitionId))
    return { source: 'paddypower', competitionId: String(competitionId), fetchedAt, matches, raw }
  } catch (error) {
    throw createError({ statusCode: 502, statusMessage: error?.message || 'Paddy Power feed unavailable.' })
  }
}

export async function fetchPaddyPowerEvent(eventId) {
  if (!/^\d+$/.test(String(eventId))) {
    throw createError({ statusCode: 400, statusMessage: 'eventId must be numeric.' })
  }

  try {
    const { fetchedAt, matches, raw } = await fetchPage(eventPageUrl(eventId))
    return { source: 'paddypower', eventId: String(eventId), fetchedAt, match: matches[0] || null, raw }
  } catch (error) {
    throw createError({ statusCode: 502, statusMessage: error?.message || 'Paddy Power feed unavailable.' })
  }
}
