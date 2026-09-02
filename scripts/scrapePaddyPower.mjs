import { createClient } from '@supabase/supabase-js'
import { pageUrls, fetchPage } from '../lib/paddyPower.js'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const client = createClient(supabaseUrl, supabaseServiceRoleKey)
const competitions = Object.keys(pageUrls)
const failures = []

for (const competition of competitions) {
  try {
    const { fetchedAt, matches, raw } = await fetchPage(pageUrls[competition])
    const { error } = await client
      .from('paddy_power_odds')
      .upsert({ competition, fetched_at: fetchedAt, matches, raw, updated_at: new Date().toISOString() })
    if (error) throw error
    console.log(`✓ ${competition}: ${matches.length} matches`)
  } catch (error) {
    failures.push(competition)
    console.error(`✗ ${competition}: ${error.message}`)
  }
}

if (failures.length === competitions.length) {
  console.error('All competitions failed to scrape.')
  process.exit(1)
}

if (failures.length) {
  console.warn(`Completed with failures: ${failures.join(', ')}`)
}
