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

// A Bet Builder's price is one figure given by the bookmaker for the whole bet, not a
// product of per-leg prices (bet-builder legs don't carry individual odds at all) —
// everywhere combined odds are shown, branch on bet type rather than always multiplying legs.
export function resolveCombinedOdds(bet, legs) {
  if (bet?.type === 'BetBuilder') return Number(bet.combinedOdds) || 1
  return (legs || []).reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
}
