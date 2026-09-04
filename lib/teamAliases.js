const ALIAS_PAIRS = [
  ['man utd', 'manchester united'],
  ['man united', 'manchester united'],
  ['man city', 'manchester city'],
  ['spurs', 'tottenham hotspur'],
  ['tottenham', 'tottenham hotspur'],
  ["nott'm forest", 'nottingham forest'],
  ['nottm forest', 'nottingham forest'],
  ['wolves', 'wolverhampton wanderers'],
  ['newcastle', 'newcastle united'],
  ['ipswich', 'ipswich town'],
  ['west ham', 'west ham united'],
  ['leicester', 'leicester city'],
  ['brighton', 'brighton and hove albion'],
  ['brighton & hove albion', 'brighton and hove albion'],
  ['real madrid', 'real madrid'],
  ['atletico madrid', 'atletico de madrid'],
  ['atleti', 'atletico de madrid'],
  ['betis', 'real betis'],
  ['sociedad', 'real sociedad'],
  ['bayern', 'bayern munich'],
  ['dortmund', 'borussia dortmund'],
  ['leverkusen', 'bayer leverkusen'],
  ['gladbach', 'borussia monchengladbach'],
  ['psg', 'paris saint germain'],
  ['paris st-g', 'paris saint germain'],
  ['marseille', 'olympique marseille'],
  ['lyon', 'olympique lyonnais'],
  ['inter', 'inter milan'],
  ['ac milan', 'milan'],
  ['juve', 'juventus']
]

export function normalizeTeamName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ') // hyphens are word separators (e.g. "Saint-Germain" -> "saint germain"),
    .replace(/[^a-z0-9\s]/g, '') // not word-fusing punctuation like other stripped characters
    .replace(/\s+/g, ' ')
    .trim()
}

// Keyed by normalizeTeamName(alias) rather than the raw alias string, so a key
// containing punctuation (e.g. "Paris St-G", "Nott'm Forest") still matches -- a
// lookup always normalizes its input the same way before checking this map.
const ALIAS_MAP = new Map(
  ALIAS_PAIRS.map(([alias, canonical]) => [normalizeTeamName(alias), canonical])
)

export function canonicalTeamName(name) {
  const normalized = normalizeTeamName(name)
  return ALIAS_MAP.get(normalized) || normalized
}

export function teamNamesMatch(left, right) {
  if (!left || !right) return false
  const a = canonicalTeamName(left)
  const b = canonicalTeamName(right)
  if (a === b) return true
  return a.includes(b) || b.includes(a)
}
