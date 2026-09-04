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
