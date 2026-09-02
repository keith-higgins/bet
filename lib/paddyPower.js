export const pageUrls = {
  'premier-league':
    'https://apisms.paddypower.com/smspp/content-managed-page/v7?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&countryCode=IE&currencyCode=EUR&customPageId=english-premier-league&exchangeLocale=en_GB&includeMarketBlurbs=true&includePrices=true&language=en&loggedIn=false&page=CUSTOM&priceHistory=3&regionCode=IRE&requestCountryCode=IE&timezone=Europe%2FDublin',
  'la-liga':
    'https://apisms.paddypower.com/smspp/competition-page/v3?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&competitionId=117&countryCode=IE&currencyCode=EUR&eventTypeId=1&exchangeLocale=en_GB&includeBadges=true&includeLayout=true&includePrices=true&includeSeoCards=true&includeSeoFooter=true&language=en&loggedIn=false&regionCode=IRE',
  'ligue-1':
    'https://apisms.paddypower.com/smspp/competition-page/v3?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&competitionId=55&countryCode=IE&currencyCode=EUR&eventTypeId=1&exchangeLocale=en_GB&includeBadges=true&includeLayout=true&includePrices=true&includeSeoCards=true&includeSeoFooter=true&language=en&loggedIn=false&regionCode=IRE',
  bundesliga:
    'https://apisms.paddypower.com/smspp/competition-page/v3?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&competitionId=59&countryCode=IE&currencyCode=EUR&eventTypeId=1&exchangeLocale=en_GB&includeBadges=true&includeLayout=true&includePrices=true&includeSeoCards=true&includeSeoFooter=true&language=en&loggedIn=false&regionCode=IRE',
  'serie-a':
    'https://apisms.paddypower.com/smspp/competition-page/v3?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&competitionId=81&countryCode=IE&currencyCode=EUR&eventTypeId=1&exchangeLocale=en_GB&includeBadges=true&includeLayout=true&includePrices=true&includeSeoCards=true&includeSeoFooter=true&language=en&loggedIn=false&regionCode=IRE',
  'champions-league':
    'https://apisms.paddypower.com/smspp/competition-page/v3?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&competitionId=228&countryCode=IE&currencyCode=EUR&eventTypeId=1&exchangeLocale=en_GB&includeBadges=true&includeLayout=true&includePrices=true&includeSeoCards=true&includeSeoFooter=true&language=en&loggedIn=false&regionCode=IRE'
}

export function competitionPageUrl(competitionId) {
  return (
    'https://apisms.paddypower.com/smspp/competition-page/v3?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&competitionId=' +
    competitionId +
    '&countryCode=IE&currencyCode=EUR&eventTypeId=1&exchangeLocale=en_GB&includeBadges=true&includeLayout=true&includePrices=true&includeSeoCards=true&includeSeoFooter=true&language=en&loggedIn=false&regionCode=IRE'
  )
}

export function eventPageUrl(eventId) {
  return (
    'https://apisms.paddypower.com/smspp/event-page/v5?_ak=vsd0Rm5ph2sS2uaK&betexRegion=IRL&capiJurisdiction=intl&countryCode=IE&currencyCode=EUR&eventId=' +
    eventId +
    '&exchangeLocale=en_GB&includeBettingOpportunities=false&includePrices=true&includeSeoCards=true&includeSeoFooter=true&language=en&loggedIn=false&priceHistory=1&regionCode=IRE'
  )
}

const browserUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

function formatOdds(runner) {
  const decimal = runner?.winRunnerOdds?.trueOdds?.decimalOdds?.decimalOdds
  if (decimal == null) return ''
  const fractional = runner?.winRunnerOdds?.trueOdds?.fractionalOdds
  const fractionalText = fractional ? fractional.numerator + '/' + fractional.denominator : ''
  return fractionalText ? fractionalText + ' (' + decimal + ')' : String(decimal)
}

function normalizeSelections(runners) {
  return (runners || [])
    .slice()
    .sort((a, b) => (a.sortPriority ?? 0) - (b.sortPriority ?? 0))
    .map((runner) => ({
      name: runner.runnerName || 'Unnamed selection',
      odds: formatOdds(runner)
    }))
}

function normalizeEventMarkets(markets, eventId) {
  return Object.values(markets)
    .filter((market) => market.eventId === eventId)
    .map((market) => ({
      name: market.marketName || 'Unnamed market',
      selections: normalizeSelections(market.runners)
    }))
    .filter((market) => market.selections.length)
}

function looksLikeFixture(name) {
  return typeof name === 'string' && / v /i.test(name)
}

function normalizeMatches(payload) {
  const events = payload?.attachments?.events || {}
  const markets = payload?.attachments?.markets || {}
  const competitions = payload?.attachments?.competitions || {}

  return Object.values(events)
    .filter((event) => looksLikeFixture(event.name))
    .map((event) => {
      const [home, away] = event.name.split(/\s+v\s+/i).map((part) => part.trim())
      return {
        id: String(event.eventId),
        name: event.name,
        home: home || '',
        away: away || '',
        startsAt: event.openDate || '',
        competition: competitions[event.competitionId]?.name || '',
        markets: normalizeEventMarkets(markets, event.eventId)
      }
    })
}

async function fetchViaBrowser(pageUrl) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: browserUserAgent })
    const page = await context.newPage()
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page
      .waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 20000 })
      .catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
    const bodyText = await page.evaluate(() => document.body.innerText)
    return JSON.parse(bodyText)
  } finally {
    await browser.close()
  }
}

export async function fetchPage(pageUrl) {
  const payload = await fetchViaBrowser(pageUrl)
  return {
    fetchedAt: new Date().toISOString(),
    matches: normalizeMatches(payload),
    raw: payload
  }
}
