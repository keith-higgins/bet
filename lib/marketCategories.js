import { CATEGORIES, categorizeMarket } from './marketCatalog.js'

// Groups a flat market list (each item shaped like { name, marketType? }) into
// ordered { key, label, markets } buckets, dropping any empty category. See
// marketCatalog.js for how each market gets assigned a category.
export function groupMarketsByCategory(markets) {
  const buckets = new Map()
  for (const market of markets) {
    const category = categorizeMarket(market)
    if (!buckets.has(category.key)) buckets.set(category.key, { ...category, markets: [] })
    buckets.get(category.key).markets.push(market)
  }
  return CATEGORIES.map((category) => buckets.get(category.key)).filter(Boolean)
}
