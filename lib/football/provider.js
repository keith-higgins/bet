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
// A few days back too — settlement (and a manual recheck) needs to keep resolving a
// match for a little while after it finishes, not just up to the moment it kicks off.
// Without this, every per-match lookup (getMatchResult/getMatchEvents/
// getPlayerMatchStats) silently returns null the day after a match, since none of
// them can find it in this cached window any more.
const RECENT_WINDOW_DAYS = 4
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

function hasStarted(status) {
  return status?.type?.state === 'in' || status?.type?.state === 'post'
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
    homeLogo: home?.team?.logo || null,
    awayLogo: away?.team?.logo || null,
    label: `${homeName} v ${awayName}`,
    startsAt: event.date || null,
    status: statusText(status),
    // ESPN's competitor.score is "0" (not null) even before kickoff, which would
    // otherwise render as a real 0-0 scoreline for a match that hasn't started yet.
    homeScore: hasStarted(status) ? Number(home?.score ?? 0) : null,
    awayScore: hasStarted(status) ? Number(away?.score ?? 0) : null,
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

// Resolves a play's named participant (e.g. the "shooter" on a shot, the "fouler" on
// a foul) against the roster's id->name map already built from the summary call — no
// extra request per play. Deliberately not text-parsing shortText (e.g. stripping
// " Foul" off "Luke Shaw Foul"): ESPN truncates shortText at a fixed length, which
// silently drops the player name entirely on a long type label like "Shot Hit
// Woodwork", and shortText's name spelling can differ from the roster's anyway.
function participantName(play, role, playerNames) {
  const id = play.participants
    ?.find((participant) => participant.type === role)
    ?.athlete?.$ref?.match(/\/athletes\/(\d+)/)?.[1]
  return playerNames.get(id) || ''
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
      const start = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      const end = new Date(Date.now() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      const range = `${formatDate(start)}-${formatDate(end)}`
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
      // Same summary call already carries both squads with headshot images — surface
      // them so the client can put a player's photo next to a player-prop pick (e.g.
      // "Bruno Fernandes to score") without a second request.
      const roster = (data.rosters || [])
        .flatMap((side) => side.roster || [])
        .map((entry) => ({
          name: entry.athlete?.displayName,
          photo: entry.athlete?.headshot?.href || null
        }))
        .filter((player) => player.name && player.photo)
      return {
        ...cached,
        status: statusText(status),
        homeScore: hasStarted(status) ? Number(home?.score ?? 0) : null,
        awayScore: hasStarted(status) ? Number(away?.score ?? 0) : null,
        minute: status?.type?.state === 'in' ? status.displayClock || cached.minute : cached.minute,
        roster
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

    // ESPN's roster entries carry the same per-player counting stats (fouls, shots)
    // we used to page through the full play-by-play for — and, verified against a
    // real match, more accurately: raw plays undercounted Bruno Fernandes' fouls
    // committed (0 vs the official 1) and shots on target (1 vs the official 2). Free
    // from the same summary call, so player-prop legs settle without ever touching the
    // expensive paginated tier below.
    const playerStats = {}
    for (const side of summary.rosters || []) {
      for (const entry of side.roster || []) {
        const name = entry.athlete?.displayName
        if (!name) continue
        const stat = (key) => Number(entry.stats?.find((item) => item.name === key)?.value) || 0
        playerStats[name] = {
          foulsCommitted: stat('foulsCommitted'),
          foulsSuffered: stat('foulsSuffered'),
          shotsOnTarget: stat('shotsOnTarget'),
          totalShots: stat('totalShots')
        }
      }
    }

    return {
      goalScorers,
      assisters,
      firstScoringTeam,
      cardedPlayers,
      saveCounts: statFor('saves'),
      foulCounts: statFor('foulsCommitted'),
      cornerCounts: statFor('wonCorners'),
      shotsOnTargetCounts: statFor('shotsOnTarget'),
      playerStats
    }
  }

  // A post/bar hit — the one per-player counting stat that isn't already in
  // getMatchEvents' official roster stats (foulsCommitted/foulsSuffered/shotsOnTarget/
  // totalShots come from there instead, both cheaper and, checked against a real
  // match, more accurate than counting these raw plays ourselves). Reserved for the
  // one selection type the cheaper tiers genuinely can't resolve: a "...including
  // woodwork" leg whose plain on-target count alone doesn't already clear the bar.
  async getPlayerMatchStats(id) {
    const fixtures = await this.getUpcomingFixtures()
    const cached = fixtures.find((fixture) => fixture.id === String(id))
    if (!cached) return null

    // Every play's participants only carry an athlete $ref (id, no name) — resolve
    // those against the full squad list, which the same summary call already returns
    // for both teams.
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

    const woodworkCounts = {}
    const bump = (counts, name) => {
      if (name) counts[name] = (counts[name] || 0) + 1
    }

    for (const play of plays) {
      if (play.type?.type === 'shot-hit-woodwork') {
        bump(woodworkCounts, participantName(play, 'shooter', playerNames))
      }
    }

    return { woodworkCounts }
  }
}

export function getFootballProvider() {
  return new FootballProvider()
}
