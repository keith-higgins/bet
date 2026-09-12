function greatestCommonDivisor(a, b) {
  while (b) [a, b] = [b, a % b]
  return a || 1
}

export function decimalToFractional(value) {
  const decimal = Number(value)
  if (!Number.isFinite(decimal) || decimal <= 1) return '1/2'
  const numerator = Math.round((decimal - 1) * 100)
  const divisor = greatestCommonDivisor(numerator, 100)
  return `${numerator / divisor}/${100 / divisor}`
}

export function fractionalToDecimal(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?$/)
  if (!match) return null
  const numerator = Number(match[1])
  const denominator = Number(match[2] || 1)
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  )
    return null
  return 1 + numerator / denominator
}

export function isValidFractionalOdds(value) {
  const decimal = fractionalToDecimal(value)
  return decimal !== null && Number.isFinite(decimal) && decimal > 1
}

// A bet's own stored combined odds — typed by the user, lifted verbatim from a
// screenshot, or (for a Bet Builder, which doesn't carry individual leg odds at all)
// the only figure that ever exists — is authoritative whenever it's actually set.
// Only fall back to multiplying the legs' own prices for a bet that's never had a
// real combined figure recorded (a brand new draft, or an older accumulator row saved
// before this was tracked as its own value).
export function resolveCombinedOdds(bet, legs) {
  const stored = Number(bet?.combinedOdds)
  if (stored > 0) return stored
  return (legs || []).reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
}
