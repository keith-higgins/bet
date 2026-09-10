import { isValidFractionalOdds } from '~/lib/odds.js'
import {
  paddyPowerOddsToFractional,
  getMatchTeams,
  resolveMarketDatabaseValue,
  MARKET_UI_VALUES
} from '~/lib/betting.js'

// Accuracy matters more than cost here — try the fuller model first, fall back to lite.
const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest']
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGemini(model, body, apiKey) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
}

// Google's free-tier flash models occasionally return 503 UNAVAILABLE under load
// (transient, not a bug here) — retry once, then fall back to a second model.
async function generateContent(body, apiKey) {
  let lastFailure
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await callGemini(model, body, apiKey)
      if (response.ok) return response
      lastFailure = { model, status: response.status, body: await response.text() }
      if (response.status !== 503) break
      await delay(800)
    }
  }
  console.warn('Gemini bet slip parse failed', lastFailure)
  return null
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    stake: { type: 'number', nullable: true },
    legs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          match: { type: 'string' },
          startsAt: { type: 'string', nullable: true },
          market: { type: 'string' },
          pick: { type: 'string' },
          odds: { type: 'string' }
        },
        required: ['match', 'market', 'pick', 'odds']
      }
    }
  },
  required: ['legs']
}

// Bookmaker slips show kickoff dates three different ways — a full date, "Today"/
// "Tomorrow", or a bare weekday name ("Sunday") with no date at all — and the model
// needs an explicit rule for the last case or it can pick the wrong week entirely,
// which then fails live-match matching even when the teams are identified correctly.
function dateResolutionInstruction() {
  const today = new Date().toISOString().slice(0, 10)
  const todayWeekday = new Date(`${today}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    timeZone: 'UTC'
  })
  return `Today's date is ${today} (a ${todayWeekday}) — resolve any relative dates on the slip against that. "Today" means ${today}; "Tomorrow" means the day after. If a kickoff line shows ONLY a bare weekday name with no date (e.g. "Sunday", "Mon"), that always means the NEXT occurrence of that weekday on or after today (never a past one, and never today itself unless the weekday name literally matches today's, i.e. ${todayWeekday}) — count forward from today to find it.`
}

function buildPrompt() {
  return `You are reading a screenshot of a football accumulator bet slip from a bookmaker app (e.g. Paddy Power, Bet365, Sky Bet). ${dateResolutionInstruction()}

This is a multi-selection accumulator. Before answering, scan the ENTIRE image from top to bottom and count how many separate selections are listed — accumulators commonly have 2 to 10+ legs, each in its own row or card, each with its own match and odds. Do not stop after the first selection. If the slip header states a fold count (e.g. "5 Fold Acca", "6 Selections"), your legs array MUST contain exactly that many entries — treat a mismatch as a sign you missed one and re-scan.

Each selection card has THREE separate pieces of text, stacked vertically — do not confuse them:
1. The pick/selection (top line, bold) — could be a team name, "Yes"/"No", "Draw", "Over 2.5", etc.
2. The market name and the two teams playing (next line down) — formatted as "Market Name - Team A v Team B", e.g. "Match Odds - Newcastle v Bournemouth" or "Both Teams To Score - Ipswich v Liverpool". The "Team A v Team B" part after the market name is what you need for "match" — it is ALWAYS two teams, even when line 1's pick is only one team's name or is "Yes"/"Draw"/etc.
3. The kickoff date/time (line below that).

Worked example — if a card reads exactly:
  Newcastle                                21/20
  Match Odds - Newcastle v Bournemouth
  13:30 Tomorrow
then you must output: {"match": "Newcastle v Bournemouth", "startsAt": "<tomorrow's date>T13:30:00", "market": "Match Odds", "pick": "Newcastle", "odds": "21/20"} — note "match" has BOTH teams even though "pick" only names one.

For each selection return:
- match: the two teams from line 2, copied EXACTLY as printed in "Home Team v Away Team" order (left team is home, right team is away), including any abbreviations (e.g. "Paris St-G" stays "Paris St-G", don't expand it). This is ALWAYS a two-team pairing — if you only found one team name, look again, you are reading the wrong line.
- startsAt: the kickoff date and time shown for this match, as an ISO 8601 string ("YYYY-MM-DDTHH:mm:00"), using the exact date and 24-hour time printed on the slip. Null if no date/time is visible.
- market: the betting market as shown (e.g. "Match result", "Both teams to score", "Total goals", "Correct score")
- pick: the exact selection text as shown (e.g. a team name, "Draw", "Over 2.5", "Yes")
- odds: the odds for that selection EXACTLY as displayed on the slip, character for character (e.g. "8/13" or "1.79/1" if shown as a fraction — note the numerator is sometimes a decimal like "1.79", copy it as-is — or "1.62" if shown as a decimal). Do not convert, simplify, or round it yourself — copy the displayed value verbatim.
Also extract the total stake amount as a number if visible, in "stake" (null if not visible).
Only include actual bet selections, ignore navigation chrome, balances, and promo banners.`
}

function canonicalizeMarket(rawMarket) {
  // Snap onto the app's canonical market label (e.g. "Both teams to score") whenever
  // this market maps onto one of our settlement categories, so the market/pick pill
  // chips — which only recognise those exact labels — highlight correctly. Bet Builder
  // player-prop markets (e.g. "To score or assist") won't match anything here and are
  // kept verbatim, same as any other market outside our settlement categories.
  return MARKET_UI_VALUES[resolveMarketDatabaseValue(rawMarket)] || rawMarket
}

function toLeg(raw) {
  const oddsFractional = paddyPowerOddsToFractional(raw.odds)
  const match = String(raw.match || '').trim()
  const { home, away } = getMatchTeams({ match })
  const rawMarket = String(raw.market || '').trim()
  return {
    match,
    home,
    away,
    startsAt: raw.startsAt || '',
    market: canonicalizeMarket(rawMarket),
    pick: String(raw.pick || '').trim(),
    odds: isValidFractionalOdds(oddsFractional) ? oddsFractional : '1/2',
    status: 'pending'
  }
}

const BUILDER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    stake: { type: 'number', nullable: true },
    match: { type: 'string' },
    startsAt: { type: 'string', nullable: true },
    combinedOdds: { type: 'string' },
    legs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          market: { type: 'string' },
          pick: { type: 'string' }
        },
        required: ['market', 'pick']
      }
    }
  },
  required: ['match', 'combinedOdds', 'legs']
}

function buildBuilderPrompt() {
  return `You are reading a screenshot of a football "Bet Builder" (also called "Same Game Multi") bet slip from a bookmaker app (e.g. Paddy Power, Bet365, Sky Bet). ${dateResolutionInstruction()}

A Bet Builder is different from a normal accumulator: it is ALL ONE MATCH with several markets combined into a single price. The layout is:
1. A header naming the bet type and leg count, e.g. "Bet Builder (4 legs)", next to ONE combined odds figure for the whole bet, e.g. "11.75/1".
2. The single match, printed ONCE, e.g. "Everton v Man Utd", followed by its kickoff date/time on the next line.
3. A list of legs underneath, each with a player/team name (bold) and a market description below it (e.g. "Bruno Fernandes" / "To Score Or Assist", or "Man Utd Goalkeeper" / "Goalkeeper To Make 2 Or More Saves"). Individual legs do NOT show their own odds — only the one combined figure at the top applies.

Extract:
- match: the two teams from the match line, copied EXACTLY as printed, in "Home Team v Away Team" order (left is home, right is away).
- startsAt: the kickoff date and time as an ISO 8601 string ("YYYY-MM-DDTHH:mm:00"), using the exact date/time printed. Null if not visible.
- combinedOdds: the ONE combined odds figure for the whole bet builder (next to the "Bet Builder (N legs)" header), copied EXACTLY as displayed, character for character — do not convert or round it.
- legs: one entry per row underneath the match, each with:
  - market: the market description text (the second line of each row, e.g. "To Score Or Assist", "Shown A Card", "Goalkeeper To Make 2 Or More Saves")
  - pick: the player/team/selection name (the bold first line of each row, e.g. "Bruno Fernandes", "Man Utd Goalkeeper"). If a row shows two names joined by an arrow/swap icon (a substitution-aware "either/or" selection, e.g. "Luke Shaw ⇄ Noussair Mazraoui"), copy both names exactly as shown, joined by " or ".
  Scan the ENTIRE image top to bottom and include every leg listed — if the header states a leg count (e.g. "4 legs"), your legs array MUST contain exactly that many entries.
Also extract the total stake amount as a number if visible, in "stake" (null if not visible).
Only include actual bet legs, ignore navigation chrome, balances, and promo banners.`
}

function toBuilderResult(parsed) {
  const match = String(parsed.match || '').trim()
  const { home, away } = getMatchTeams({ match })
  const combinedOdds = paddyPowerOddsToFractional(parsed.combinedOdds)
  const legs = Array.isArray(parsed.legs)
    ? parsed.legs
        .map((raw) => ({
          market: canonicalizeMarket(String(raw.market || '').trim()),
          pick: String(raw.pick || '').trim()
        }))
        .filter((leg) => leg.market && leg.pick)
    : []
  return {
    stake: Number.isFinite(Number(parsed.stake)) ? Number(parsed.stake) : null,
    match,
    home,
    away,
    startsAt: parsed.startsAt || '',
    combinedOdds: isValidFractionalOdds(combinedOdds) ? combinedOdds : '',
    legs
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.geminiApiKey) {
    throw createError({ statusCode: 501, statusMessage: 'Bet slip scanning is not configured.' })
  }

  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'image')
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Upload a bet slip screenshot.' })
  }
  if (file.data.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Image is too large (8MB max).' })
  }
  const betTypeField = parts?.find((part) => part.name === 'betType')
  const isBuilder = betTypeField?.data?.toString('utf8') === 'BetBuilder'

  const mimeType = file.type || 'image/png'
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: isBuilder ? buildBuilderPrompt() : buildPrompt() },
          { inlineData: { mimeType, data: file.data.toString('base64') } }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: isBuilder ? BUILDER_RESPONSE_SCHEMA : RESPONSE_SCHEMA,
      temperature: 0
    }
  }

  const response = await generateContent(body, config.geminiApiKey)
  if (!response) {
    throw createError({ statusCode: 502, statusMessage: 'Bet slip scanning failed. Try again or enter it manually.' })
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Couldn't read that slip. Try a clearer screenshot or enter it manually." })
  }

  if (isBuilder) {
    const builderResult = toBuilderResult(parsed)
    if (!builderResult.match || !builderResult.combinedOdds || !builderResult.legs.length) {
      throw createError({ statusCode: 422, statusMessage: "Couldn't find the match, combined odds, or any legs on that slip. Try a clearer screenshot or enter it manually." })
    }
    return builderResult
  }

  const legs = Array.isArray(parsed.legs)
    ? parsed.legs.map(toLeg).filter((leg) => leg.match && leg.market && leg.pick)
    : []
  if (!legs.length) {
    throw createError({ statusCode: 422, statusMessage: "Couldn't find any selections on that slip. Try a clearer screenshot or enter it manually." })
  }

  return {
    stake: Number.isFinite(Number(parsed.stake)) ? Number(parsed.stake) : null,
    legs
  }
})
