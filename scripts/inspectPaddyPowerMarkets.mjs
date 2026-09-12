// One-off inspection tool — cross-references Paddy Power's raw market list
// (attachments.markets, keyed by marketType) against their own real category
// structure (layout.cards[*].marketTypes) for a batch of real fixtures, to check the
// two line up cleanly before building a marketType -> category table from it.
//
// Usage: node scripts/inspectPaddyPowerMarkets.mjs [competition] [fixtureCount]
// competition defaults to 'premier-league', fixtureCount defaults to 5.
// Needs network access to Paddy Power (this dev sandbox can't reach it — run this on
// a machine that can, e.g. with your VPN on).

import { pageUrls, eventPageUrl, fetchPage, launchBrowser } from '../lib/paddyPower.js'

const competition = process.argv[2] || 'premier-league'
const fixtureCount = Number(process.argv[3]) || 5
if (!pageUrls[competition]) {
  console.error(`Unknown competition "${competition}". Options: ${Object.keys(pageUrls).join(', ')}`)
  process.exit(1)
}

// "Popular" and "Bet Builder" are curated cross-cutting shortlists, not exclusive
// categories (the same marketType shows up in one of these AND in its real home tab,
// e.g. V_OVER_UNDER sits in both "Goals" and "Over/Under" and "Bet Builder") — exclude
// them when deciding a market's real category, but still track Bet Builder
// membership separately since that's PP's actual same-game-multi eligibility list.
const BET_BUILDER_TAB_TITLE = 'Bet Builder'
const NON_CATEGORY_TABS = new Set(['Popular', BET_BUILDER_TAB_TITLE])

const browser = await launchBrowser()
try {
  console.log(`Fetching ${competition} competition page…`)
  const { matches } = await fetchPage(pageUrls[competition], browser)
  console.log(`Found ${matches.length} fixtures. Inspecting the first ${fixtureCount}.`)

  // marketType -> { names: Set<marketName>, categories: Set<tab title>, betBuilder: bool }
  const catalog = new Map()

  for (const fixture of matches.slice(0, fixtureCount)) {
    console.log(`\nFetching: ${fixture.name}`)
    const { raw } = await fetchPage(eventPageUrl(fixture.id), browser)
    const rawMarkets = Object.values(raw?.attachments?.markets || {})
    const cards = Object.values(raw?.layout?.cards || {}).filter((card) => card.marketTypes)
    console.log(`  ${rawMarkets.length} raw markets, ${cards.length} category cards`)

    for (const market of rawMarkets) {
      const entry = catalog.get(market.marketType) || {
        names: new Set(),
        categories: new Set(),
        betBuilder: false
      }
      entry.names.add(market.marketName)
      for (const card of cards) {
        if (!card.marketTypes.includes(market.marketType)) continue
        if (card.title === BET_BUILDER_TAB_TITLE) entry.betBuilder = true
        if (!NON_CATEGORY_TABS.has(card.title)) entry.categories.add(card.title)
      }
      catalog.set(market.marketType, entry)
    }
  }

  console.log(`\n${catalog.size} distinct marketType values seen. Checking category coverage…`)

  const uncategorized = []
  const multiCategory = []
  for (const [marketType, entry] of catalog) {
    if (entry.categories.size === 0) uncategorized.push({ marketType, names: [...entry.names] })
    if (entry.categories.size > 1) {
      multiCategory.push({ marketType, categories: [...entry.categories], names: [...entry.names] })
    }
  }

  console.log(`\n=== ${uncategorized.length} market types with NO real category (gap) ===`)
  uncategorized.forEach((item) => console.log(`${item.marketType}: ${item.names.join(', ')}`))

  console.log(`\n=== ${multiCategory.length} market types claimed by more than one real category ===`)
  multiCategory.forEach((item) =>
    console.log(`${item.marketType} -> [${item.categories.join(', ')}] (${item.names.join(', ')})`)
  )

  console.log('\n=== Full marketType -> category / Bet Builder eligibility table ===')
  for (const [marketType, entry] of [...catalog.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(
      `${marketType} | category: ${[...entry.categories].join('/') || '—'} | betBuilder: ${entry.betBuilder} | name(s): ${[...entry.names].join(', ')}`
    )
  }
} finally {
  await browser.close()
}
