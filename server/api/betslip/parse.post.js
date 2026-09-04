import { isValidFractionalOdds } from '~/lib/odds.js'
import { paddyPowerOddsToFractional } from '~/lib/betting.js'

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
          home: { type: 'string' },
          away: { type: 'string' },
          market: { type: 'string' },
          pick: { type: 'string' },
          odds: { type: 'string' }
        },
        required: ['market', 'pick', 'odds']
      }
    }
  },
  required: ['legs']
}

const PROMPT = `You are reading a screenshot of a football accumulator bet slip from a bookmaker app (e.g. Paddy Power, Bet365, Sky Bet).

This is a multi-selection accumulator. Before answering, scan the ENTIRE image from top to bottom and count how many separate selections are listed — accumulators commonly have 2 to 10+ legs, each in its own row or card, each with its own match and odds. Do not stop after the first selection. If the slip header states a fold count (e.g. "5 Fold Acca", "6 Selections"), your legs array MUST contain exactly that many entries — treat a mismatch as a sign you missed one and re-scan.

For each selection return:
- home: the home team name, copied exactly as printed on the slip — nothing added, nothing paraphrased, no extra words. Empty string if not determinable.
- away: the away team name, copied exactly as printed on the slip — nothing added, nothing paraphrased, no extra words. Empty string if not determinable.
- market: the betting market as shown (e.g. "Match result", "Both teams to score", "Total goals", "Correct score")
- pick: the exact selection text as shown (e.g. a team name, "Draw", "Over 2.5", "Yes")
- odds: the odds for that selection EXACTLY as displayed on the slip, character for character (e.g. "8/13" or "1.79/1" if shown as a fraction — note the numerator is sometimes a decimal like "1.79", copy it as-is — or "1.62" if shown as a decimal). Do not convert, simplify, or round it yourself — copy the displayed value verbatim.
Also extract the total stake amount as a number if visible, in "stake" (null if not visible).
Only include actual bet selections, ignore navigation chrome, balances, and promo banners.`

function toLeg(raw) {
  const oddsFractional = paddyPowerOddsToFractional(raw.odds)
  return {
    match: [raw.home, raw.away].filter(Boolean).join(' v '),
    home: raw.home || '',
    away: raw.away || '',
    market: String(raw.market || '').trim(),
    pick: String(raw.pick || '').trim(),
    odds: isValidFractionalOdds(oddsFractional) ? oddsFractional : '1/2',
    status: 'pending'
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

  const mimeType = file.type || 'image/png'
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: PROMPT }, { inlineData: { mimeType, data: file.data.toString('base64') } }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
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

  const legs = Array.isArray(parsed.legs) ? parsed.legs.map(toLeg).filter((leg) => leg.market && leg.pick) : []
  if (!legs.length) {
    throw createError({ statusCode: 422, statusMessage: "Couldn't find any selections on that slip. Try a clearer screenshot or enter it manually." })
  }

  return {
    stake: Number.isFinite(Number(parsed.stake)) ? Number(parsed.stake) : null,
    legs
  }
})
