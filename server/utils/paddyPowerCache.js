import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) return null
  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)
}

export async function readCachedPaddyPowerOdds(competition) {
  const client = adminClient()
  if (!client) {
    throw createError({ statusCode: 503, statusMessage: 'Supabase is not configured.' })
  }

  const { data, error } = await client
    .from('paddy_power_odds')
    .select('competition, fetched_at, matches, updated_at')
    .eq('competition', competition)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: `No cached odds for ${competition} yet. Run the scrape job first.`
    })
  }

  return {
    source: 'paddypower-cache',
    competition: data.competition,
    fetchedAt: data.fetched_at,
    updatedAt: data.updated_at,
    matches: data.matches
  }
}
