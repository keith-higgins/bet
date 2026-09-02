import { createClient } from '@supabase/supabase-js'
import { pageUrls, eventPageUrl, fetchPage, launchBrowser } from '../lib/paddyPower.js'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const EVENT_FETCH_THROTTLE_MS = 500

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function loadFullMarkets(match, browser) {
  try {
    const { matches } = await fetchPage(eventPageUrl(match.id), browser)
    const full = matches[0]
    if (full?.markets?.length) match.markets = full.markets
  } catch (error) {
    console.warn(`  ! ${match.name}: full markets unavailable (${error.message}), keeping Match Odds only`)
  }
}

const client = createClient(supabaseUrl, supabaseServiceRoleKey)
const competitions = Object.keys(pageUrls)
const failures = []
const browser = await launchBrowser()

try {
  for (const competition of competitions) {
    try {
      const { fetchedAt, matches, raw } = await fetchPage(pageUrls[competition], browser)

      for (const match of matches) {
        await loadFullMarkets(match, browser)
        await sleep(EVENT_FETCH_THROTTLE_MS)
      }

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
} finally {
  await browser.close()
}

if (failures.length === competitions.length) {
  console.error('All competitions failed to scrape.')
  process.exit(1)
}

if (failures.length) {
  console.warn(`Completed with failures: ${failures.join(', ')}`)
}
