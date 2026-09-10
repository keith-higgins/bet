import { normalizeTeamName, canonicalTeamName, teamNamesMatch } from '../teamAliases.js'

// OCR'd/parsed kickoff times can be off by a day or more — team pairing already does
// the real disambiguation, so this window is a generous safety margin, not the primary check.
const MATCH_WINDOW_MS = 4 * 24 * 60 * 60 * 1000

// ESPN's public site API (undocumented but free, keyless, and far better populated
// than TheSportsDB's free demo key — see github.com/pseudo-r/Public-ESPN-API).
const baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
// Only used for per-player counting stats (fouls, shots) that ESPN's site-API summary
// doesn't expose at player granularity — the full play-by-play does, at the cost of
// several paginated requests. Reserved for the rare case the cheaper tiers can't
// resolve a selection; never used for the routine search/live-score/score-based paths.
const coreBaseUrl = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues'
const PLAYS_PAGE_SIZE = 300
const LEAGUES = [
  { slug: 'eng.1', name: 'English Premier League' },
  { slug: 'esp.1', name: 'Spanish La Liga' },
  { slug: 'ger.1', name: 'German Bundesliga' },
  { slug: 'ita.1', name: 'Italian Serie A' },
  { slug: 'fra.1', name: 'French Ligue 1' },
  { slug: 'uefa.champions', name: 'UEFA Champions League' }
]
// How far ahead to look for fixtures — a betting app only ever needs near-term
// matches, so this stays far cheaper than pulling a whole season.
const UPCOMING_WINDOW_DAYS = 35
const CACHE_TTL_MS = 15 * 60 * 1000

let fixturesCache = { expiresAt: 0, fixtures: [] }
let fixturesLoadPromise

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// ESPN's status.type.state is a clean 'pre'/'in'/'post' enum, but the rest of the app
// (LiveScoresCard.vue) matches on substrings like "progress"/"finished" left over from
// the previous provider — translate here so no client code needs to change.
function statusText(status) {
  if (status?.type?.state === 'post') return 'Match Finished'
  if (status?.type?.state === 'in') return 'In Progress'
  return status?.type?.description || 'Scheduled'
}

function toFixture(event, competition, leagueSlug) {
  if (!event?.id) return null
  const competition_ = event.competitions?.[0]
  const competitors = competition_?.competitors || []
  const home = competitors.find((item) => item.homeAway === 'home')
  const away = competitors.find((item) => item.homeAway === 'away')
  const status = competition_?.status
  const homeName = home?.team?.displayName || 'Home team'
  const awayName = away?.team?.displayName || 'Away team'
  return {
    id: String(event.id),
    provider: 'espn',
    leagueSlug,
    competition,
    home: homeName,
    away: awayName,
    label: `${homeName} v ${awayName}`,
    startsAt: event.date || null,
    status: statusText(status),
    homeScore: home?.score != null && home.score !== '' ? Number(home.score) : null,
    awayScore: away?.score != null && away.score !== '' ? Number(away.score) : null,
    minute: status?.type?.state === 'in' ? status.displayClock || null : null
  }
}

async function fetchWithRetry(url) {
  let lastError
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await $fetch(url)
    } catch (error) {
      lastError = error
      const statusCode = error?.statusCode || error?.response?.status
      const retryable = !statusCode || statusCode === 429 || statusCode >= 500
      if (!retryable || attempt === 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw lastError
}

// Player-attributed plays put the name as a prefix of shortText (e.g. "Luke Shaw
// Foul") — strip the known type label off the end rather than resolving the athlete
// $ref, which would cost a second request per play.
function playerFromPlay(play) {
  const suffix = ` ${play.type?.text || ''}`
  return play.shortText?.endsWith(suffix) ? play.shortText.slice(0, -suffix.length).trim() : ''
}

export class FootballProvider {
  async request(path) {
    return fetchWithRetry(`${baseUrl}${path}`)
  }

  async requestCore(path) {
    return fetchWithRetry(`${coreBaseUrl}${path}`)
  }

  // One cached, shared window of near-term fixtures across all 6 tracked competitions
  // — everything else (search, exact-match linking, live refresh) reads from this
  // instead of hitting ESPN per lookup.
  async getUpcomingFixtures() {
    if (fixturesCache.expiresAt >= Date.now()) return fixturesCache.fixtures

    if (!fixturesLoadPromise) {
      const today = new Date()
      const end = new Date(Date.now() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      const range = `${formatDate(today)}-${formatDate(end)}`
      fixturesLoadPromise = Promise.allSettled(
        LEAGUES.map(async (league) => {
          const data = await this.request(`/${league.slug}/scoreboard?dates=${range}&limit=300`)
          return (data.events || [])
            .map((event) => toFixture(event, league.name, league.slug))
            .filter(Boolean)
        })
      ).then((responses) => {
        const successful = responses.filter((response) => response.status === 'fulfilled')
        if (!successful.length) throw new Error('Football provider is temporarily unavailable.')
        const fixtures = successful.flatMap((response) => response.value)
        fixturesCache = { expiresAt: Date.now() + CACHE_TTL_MS, fixtures }
        return fixtures
      })
    }

    try {
      return await fixturesLoadPromise
    } finally {
      fixturesLoadPromise = undefined
    }
  }

  filterFixtures(events, query = '') {
    // Compare through normalizeTeamName rather than a raw substring check — event
    // labels keep punctuation from the provider's raw team names (e.g. "Paris
    // Saint-Germain"), which won't literally contain an already-normalized,
    // punctuation-stripped query (e.g. "paris saint germain"). Also canonicalize the
    // query first — an abbreviation like "man utd" isn't a literal substring of
    // "manchester united" either, so resolve known aliases before matching. A partial,
    // still-being-typed prefix (e.g. "man") has no alias entry and just falls through
    // to the plain substring check unchanged.
    const normalizedQuery = normalizeTeamName(canonicalTeamName(query))
    const cutoff = Date.now() - 3 * 60 * 60 * 1000
    return events
      .filter((event) => {
        const startsAt = event.startsAt ? new Date(event.startsAt).getTime() : NaN
        return Number.isNaN(startsAt) || startsAt >= cutoff
      })
      .filter((event) => !normalizedQuery || normalizeTeamName(event.label).includes(normalizedQuery))
      .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))
  }

  async getFixtures(query = '') {
    const fixtures = await this.getUpcomingFixtures()
    return this.filterFixtures(fixtures, query)
  }

  // Used once we already know exactly which match we want (e.g. linking a Paddy Power
  // selection or a parsed screenshot to live scores) — same cached fixture window as
  // getFixtures, just matched on the known team pairing instead of a text query.
  async findFixture({ home, away, startsAt }) {
    if (!home || !away) return null
    const fixtures = await this.getUpcomingFixtures()
    const matchStart = startsAt ? new Date(startsAt).getTime() : NaN
    return (
      fixtures.find((fixture) => {
        const withinWindow =
          Number.isNaN(matchStart) ||
          !fixture.startsAt ||
          Math.abs(new Date(fixture.startsAt).getTime() - matchStart) < MATCH_WINDOW_MS
        return withinWindow && teamNamesMatch(fixture.home, home) && teamNamesMatch(fixture.away, away)
      }) || null
    )
  }

  // Refreshes one already-known fixture's live status/score — looks it up in the cached
  // window first (to learn which league it belongs to, which ESPN's summary endpoint
  // requires), then fetches that match's own live data directly.
  async getMatchResult(id) {
    const fixtures = await this.getUpcomingFixtures()
    const cached = fixtures.find((fixture) => fixture.id === String(id))
    if (!cached) return null
    try {
      const data = await this.request(`/${cached.leagueSlug}/summary?event=${cached.id}`)
      const competition = data.header?.competitions?.[0]
      const competitors = competition?.competitors || []
      const home = competitors.find((item) => item.homeAway === 'home')
      const away = competitors.find((item) => item.homeAway === 'away')
      const status = competition?.status
      return {
        ...cached,
        status: statusText(status),
        homeScore: home?.score != null && home.score !== '' ? Number(home.score) : cached.homeScore,
        awayScore: away?.score != null && away.score !== '' ? Number(away.score) : cached.awayScore,
        minute: status?.type?.state === 'in' ? status.displayClock || cached.minute : cached.minute
      }
    } catch {
      return cached
    }
  }

  async getLiveMatches(ids = []) {
    return Promise.all(ids.filter(Boolean).map((id) => this.getMatchResult(id)))
  }

  // Extracts a settlement-ready summary (goalscorers, assisters, cards, and team-level
  // saves/fouls/corners/shots-on-target) for a finished match. Everything comes from
  // the same `summary` call getMatchResult already makes — ESPN's boxscore already has
  // these team stats pre-aggregated (and more accurate than counting raw play-by-play
  // events ourselves turned out to be — a manual per-play save count overcounted
  // goalkeeper claims/catches against the official stat). No extra endpoint, no
  // pagination.
  async getMatchEvents(id) {
    const fixtures = await this.getUpcomingFixtures()
    const cached = fixtures.find((fixture) => fixture.id === String(id))
    if (!cached) return null

    const summary = await this.request(`/${cached.leagueSlug}/summary?event=${cached.id}`)

    // Goals come as three distinct key-event types — a plain 'goal', a
    // 'penalty---scored' (NOT tagged 'goal', so it's easy to silently drop — a 7-goal
    // match only had 5 'goal' events; the other 2 were a penalty and an own goal), and
    // an 'own-goal'. Penalties count as a normal scorer credit; own goals count toward
    // the match (first-team-to-score, total goals) but never credit the unlucky player,
    // matching standard betting convention.
    const scoringEvents = (summary.keyEvents || []).filter((event) =>
      ['goal', 'penalty---scored', 'own-goal'].includes(event.type?.type)
    )
    // A goal's own participants array is the reliable source for both scorer and
    // assist — participants[0] is always the scorer, participants[1] (when present) is
    // whoever assisted it. This is tied directly to a confirmed goal, unlike the raw
    // play-by-play's separate 'assist'/'assists-shot' plays, which fire for nearly any
    // pass leading to a shot attempt regardless of whether it produced a goal.
    const scorerEvents = scoringEvents.filter((event) => event.type.type !== 'own-goal')
    const goalScorers = scorerEvents.map((event) => event.participants?.[0]?.athlete?.displayName).filter(Boolean)
    const assisters = scorerEvents.map((event) => event.participants?.[1]?.athlete?.displayName).filter(Boolean)
    // keyEvents arrives in chronological order, so the first scoring event (including
    // an own goal, which still counts for "first to score") tells us which side scored
    // first.
    const firstScoringTeam = scoringEvents.length
      ? teamNamesMatch(scoringEvents[0].team?.displayName, cached.home)
        ? 'home'
        : 'away'
      : null

    const cardedPlayers = (summary.keyEvents || [])
      .filter((event) => event.type?.type === 'yellow-card' || event.type?.type === 'red-card')
      .map((event) => ({
        player: event.participants?.[0]?.athlete?.displayName,
        type: event.type.type === 'red-card' ? 'red' : 'yellow'
      }))
      .filter((card) => card.player)

    const teamStats = Object.fromEntries(
      (summary.boxscore?.teams || []).map((team) => [
        team.homeAway,
        Object.fromEntries((team.statistics || []).map((stat) => [stat.name, Number(stat.displayValue)]))
      ])
    )
    const statFor = (name) => ({
      home: teamStats.home?.[name] || 0,
      away: teamStats.away?.[name] || 0
    })

    return {
      goalScorers,
      assisters,
      firstScoringTeam,
      cardedPlayers,
      saveCounts: statFor('saves'),
      foulCounts: statFor('foulsCommitted'),
      cornerCounts: statFor('wonCorners'),
      shotsOnTargetCounts: statFor('shotsOnTarget')
    }
  }

  // Per-player fouls committed, fouls suffered, and total shots — ESPN's site-API
  // summary only has these at team level, so this pages through the full play-by-play
  // instead. Reserved for the rare selection the cheaper tiers can't resolve; a normal
  // bet never triggers this.
  async getPlayerMatchStats(id) {
    const fixtures = await this.getUpcomingFixtures()
    const cached = fixtures.find((fixture) => fixture.id === String(id))
    if (!cached) return null

    // The fouler's name is free from a foul play's own shortText, but the "fouled"
    // participant only carries an athlete $ref (id, no name) — resolve those against
    // the full squad list, which the same summary call already returns for both teams.
    const summary = await this.request(`/${cached.leagueSlug}/summary?event=${cached.id}`)
    const playerNames = new Map()
    for (const side of summary.rosters || []) {
      for (const entry of side.roster || []) {
        if (entry.athlete?.id) playerNames.set(String(entry.athlete.id), entry.athlete.displayName)
      }
    }

    const first = await this.requestCore(
      `/${cached.leagueSlug}/events/${cached.id}/competitions/${cached.id}/plays?limit=${PLAYS_PAGE_SIZE}&page=1`
    )
    const pageCount = first.pageCount || 1
    const restPages = await Promise.allSettled(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        this.requestCore(
          `/${cached.leagueSlug}/events/${cached.id}/competitions/${cached.id}/plays?limit=${PLAYS_PAGE_SIZE}&page=${index + 2}`
        )
      )
    )
    const plays = [
      ...(first.items || []),
      ...restPages.filter((page) => page.status === 'fulfilled').flatMap((page) => page.value.items || [])
    ]

    const foulCommittedCounts = {}
    const foulSufferedCounts = {}
    const shotCounts = {}
    const playerShotsOnTargetCounts = {}
    const bump = (counts, name) => {
      if (name) counts[name] = (counts[name] || 0) + 1
    }

    for (const play of plays) {
      const type = play.type?.type
      if (type === 'foul') {
        bump(foulCommittedCounts, playerFromPlay(play))
        const fouledId = play.participants
          ?.find((participant) => participant.type === 'fouled')
          ?.athlete?.$ref?.match(/\/athletes\/(\d+)/)?.[1]
        bump(foulSufferedCounts, playerNames.get(fouledId))
      } else if (type === 'shot-on-target' || type === 'shot-off-target' || type === 'shot-blocked') {
        bump(shotCounts, playerFromPlay(play))
        if (type === 'shot-on-target') bump(playerShotsOnTargetCounts, playerFromPlay(play))
      }
    }

    return { foulCommittedCounts, foulSufferedCounts, shotCounts, playerShotsOnTargetCounts }
  }
}

export function getFootballProvider() {
  return new FootballProvider()
}
