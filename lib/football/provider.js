const baseUrl = 'https://www.thesportsdb.com/api/v1/json'
const majorLeagues = [
  { id: '4328', name: 'English Premier League' },
  { id: '4335', name: 'Spanish La Liga' },
  { id: '4331', name: 'German Bundesliga' },
  { id: '4332', name: 'Italian Serie A' },
  { id: '4334', name: 'French Ligue 1' },
  { id: '4480', name: 'UEFA Champions League' }
]
const majorLeagueIds = new Set(majorLeagues.map((league) => league.id))
const majorLeagueNames = new Set(majorLeagues.map((league) => league.name.toLowerCase()))
const nonSeniorTeamPattern =
  /\b(?:u[-\s]?1[89]|u[-\s]?[23]\d|under[-\s]?(?:18|19|21|23)|youth|academy|reserve|reserves|women|ladies|feminine)\b/i
let seasonCache = { season: '', expiresAt: 0, events: [] }

function currentSeason() {
  const year = new Date().getUTCFullYear()
  const month = new Date().getUTCMonth()
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function toFixture(event, competition = event?.strLeague || 'Football') {
  if (!event?.idEvent) return null
  return {
    id: String(event.idEvent),
    provider: 'thesportsdb',
    leagueId: String(event.idLeague || ''),
    competition,
    home: event.strHomeTeam || 'Home team',
    away: event.strAwayTeam || 'Away team',
    label: `${event.strHomeTeam || 'Home team'} v ${event.strAwayTeam || 'Away team'}`,
    startsAt: event.strTimestamp || event.dateEvent || null,
    status: event.strStatus || 'Scheduled',
    homeScore: event.intHomeScore == null ? null : Number(event.intHomeScore),
    awayScore: event.intAwayScore == null ? null : Number(event.intAwayScore),
    minute: event.strProgress || null
  }
}

function isSeniorTeam(name) {
  return Boolean(name) && !nonSeniorTeamPattern.test(String(name))
}

function belongsToMajorLeague(event, leagueId = '') {
  const eventLeagueId = String(event?.idLeague || '')
  if (leagueId) return eventLeagueId === leagueId
  return (
    majorLeagueIds.has(eventLeagueId) ||
    majorLeagueNames.has(
      String(event?.strLeague || '')
        .trim()
        .toLowerCase()
    )
  )
}

function isSeniorMajorLeagueEvent(event, leagueId = '') {
  return (
    belongsToMajorLeague(event, leagueId) &&
    isSeniorTeam(event?.strHomeTeam) &&
    isSeniorTeam(event?.strAwayTeam)
  )
}

function isSeniorMajorLeagueTeam(team) {
  return (
    isSeniorTeam(team?.strTeam) &&
    (majorLeagueIds.has(String(team?.idLeague || '')) ||
      majorLeagueNames.has(
        String(team?.strLeague || '')
          .trim()
          .toLowerCase()
      ))
  )
}

export class FootballProvider {
  constructor({ apiKey = '123' } = {}) {
    this.apiKey = apiKey
  }

  async request(path, params = {}) {
    const search = new URLSearchParams(params)
    const response = await $fetch(`${baseUrl}/${this.apiKey}/${path}?${search}`)
    return response
  }

  async getFixtures(query = '') {
    const season = currentSeason()
    if (seasonCache.season !== season || seasonCache.expiresAt < Date.now()) {
      const responses = await Promise.allSettled(
        majorLeagues.map(async (league) => {
          const data = await this.request('eventsseason.php', { id: league.id, s: season })
          const events = data.events || []
          const nextData = await this.request('eventsnextleague.php', { id: league.id })
          return [...events, ...(nextData.events || [])]
            .filter((event) => isSeniorMajorLeagueEvent(event, league.id))
            .map((event) => toFixture(event, league.name))
            .filter(Boolean)
        })
      )
      const events = responses
        .filter((response) => response.status === 'fulfilled')
        .flatMap((response) => response.value)
      seasonCache = {
        season,
        expiresAt: Date.now() + 5 * 60 * 1000,
        events: [...new Map(events.map((event) => [event.id, event])).values()]
      }
    }
    const normalizedQuery = query.trim().toLowerCase()
    const cutoff = Date.now() - 3 * 60 * 60 * 1000
    const fixtures = seasonCache.events
      .filter((event) => {
        const startsAt = event.startsAt ? new Date(event.startsAt).getTime() : NaN
        return Number.isNaN(startsAt) || startsAt >= cutoff
      })
      .filter((event) => !normalizedQuery || event.label.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))

    if (fixtures.length || !normalizedQuery) return fixtures

    const search = normalizedQuery.replace(/\s+vs?\s+/i, '_vs_').replace(/\s+/g, '_')
    const data = await this.request('searchevents.php', { e: search })
    const eventResults = (data.event || data.events || [])
      .filter((event) => isSeniorMajorLeagueEvent(event))
      .map((event) => toFixture(event, event.strLeague || 'Football'))
      .filter((event) => event && (!event.startsAt || new Date(event.startsAt).getTime() >= cutoff))
    if (eventResults.length) return eventResults

    const teamData = await this.request('searchteams.php', { t: query.trim() })
    const teamResults = await Promise.allSettled(
      (teamData.teams || [])
        .filter(isSeniorMajorLeagueTeam)
        .slice(0, 5)
        .map(async (team) => {
          const nextData = await this.request('eventsnext.php', { id: team.idTeam })
          return (nextData.events || [])
            .filter((event) => isSeniorMajorLeagueEvent(event))
            .map((event) => toFixture(event, event.strLeague || 'Football'))
            .filter(Boolean)
        })
    )
    return teamResults
      .filter((response) => response.status === 'fulfilled')
      .flatMap((response) => response.value)
      .filter((event) => event && (!event.startsAt || new Date(event.startsAt).getTime() >= cutoff))
  }

  async getMatchResult(id) {
    const data = await this.request('lookupevent.php', { id })
    return toFixture(data.events?.[0])
  }

  async getLiveMatches(ids = []) {
    return Promise.all(ids.filter(Boolean).map((id) => this.getMatchResult(id)))
  }
}

export function getFootballProvider() {
  const config = useRuntimeConfig()
  return new FootballProvider({ apiKey: config.footballProviderApiKey || '123' })
}
