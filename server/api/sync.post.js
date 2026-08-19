import { getFootballProvider } from '~/lib/football/provider.js'

export default defineEventHandler(async () => ({ ok: true, provider: 'not-configured', matches: await getFootballProvider().getLiveMatches(), syncedAt: new Date().toISOString() }))
