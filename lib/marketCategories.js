// Paddy Power returns 60-100+ markets per fixture. These rules bucket the raw
// market names into a handful of scannable categories for the bet builder's
// market picker, so a player chooses a category first and then a market from
// a much shorter list, rather than scrolling one wall of chips.
const CATEGORY_RULES = [
  {
    key: 'result',
    label: 'Match result',
    test: /match odds|double chance|draw no bet|to win to nil|^1x2$|^result$|both halves/i
  },
  {
    key: 'scorer',
    label: 'Goalscorer',
    test: /scorer/i
  },
  {
    key: 'goals',
    label: 'Goals',
    test: /goal|both teams to score|btts/i
  },
  {
    key: 'correct-score',
    label: 'Correct score',
    test: /correct score/i
  },
  {
    key: 'handicap',
    label: 'Handicap',
    test: /handicap/i
  },
  {
    key: 'segments',
    label: 'Halves & segments',
    test: /1st half|2nd half|first half|second half|half time|half-time/i
  }
]
const OTHER_CATEGORY = { key: 'other', label: 'Specials & other' }

export function categorizeMarketName(name) {
  const rule = CATEGORY_RULES.find((item) => item.test.test(String(name || '')))
  return rule ? { key: rule.key, label: rule.label } : OTHER_CATEGORY
}

// Groups a flat market list (each item shaped like { name, ... }) into
// ordered { key, label, markets } buckets, dropping any empty category.
export function groupMarketsByCategory(markets) {
  const buckets = new Map()
  for (const market of markets) {
    const category = categorizeMarketName(market.name)
    if (!buckets.has(category.key)) buckets.set(category.key, { ...category, markets: [] })
    buckets.get(category.key).markets.push(market)
  }
  const order = [...CATEGORY_RULES.map((rule) => rule.key), OTHER_CATEGORY.key]
  return order.map((key) => buckets.get(key)).filter(Boolean)
}
