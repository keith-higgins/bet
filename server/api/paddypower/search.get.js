import { readAllCachedPaddyPowerOdds } from '~/server/utils/paddyPowerCache.js'
import { normalizeTeamName } from '~/lib/teamAliases.js'

const RESULT_LIMIT = 8

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = normalizeTeamName(String(query.q || ''))
  if (!search) return { matches: [] }

  const rows = await readAllCachedPaddyPowerOdds()
  const cutoff = Date.now() - 3 * 60 * 60 * 1000

  const matches = rows
    .flatMap((row) => (row.matches || []).map((match) => ({ ...match, competition: match.competition || row.competition })))
    .filter((match) => {
      const startsAt = match.startsAt ? new Date(match.startsAt).getTime() : NaN
      return Number.isNaN(startsAt) || startsAt >= cutoff
    })
    .filter((match) => {
      const home = normalizeTeamName(match.home)
      const away = normalizeTeamName(match.away)
      const name = normalizeTeamName(match.name)
      return home.includes(search) || away.includes(search) || name.includes(search)
    })
    .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))
    .slice(0, RESULT_LIMIT)

  return { matches }
})
