export class FootballProvider {
  async getFixtures() {
    return []
  }
  async getLiveMatches() {
    return []
  }
  async getMatchResult() {
    return null
  }
}

export function getFootballProvider() {
  return new FootballProvider()
}
