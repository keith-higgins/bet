<script setup>
const leagues = [
  { value: 'premier-league', label: 'Premier League' },
  { value: 'la-liga', label: 'La Liga' },
  { value: 'ligue-1', label: 'Ligue 1' },
  { value: 'bundesliga', label: 'Bundesliga' },
  { value: 'serie-a', label: 'Serie A' },
  { value: 'champions-league', label: 'Champions League' }
]

const modes = [
  { value: 'league', label: 'League' },
  { value: 'competition', label: 'Competition ID' },
  { value: 'event', label: 'Event ID (full markets)' }
]

const mode = ref('league')
const league = ref(leagues[0].value)
const competitionId = ref('')
const eventId = ref('')
const loading = ref(false)
const error = ref('')
const result = ref(null)
const eventResult = ref(null)

const expandedId = ref('')
const expandedMarkets = reactive({})
const expandedLoading = ref('')
const expandedError = ref('')

async function toggleExpand(match) {
  if (expandedId.value === match.id) {
    expandedId.value = ''
    return
  }
  expandedId.value = match.id
  expandedError.value = ''
  if (expandedMarkets[match.id]) return

  expandedLoading.value = match.id
  try {
    const data = await $fetch(`/api/paddypower/event/${match.id}`)
    expandedMarkets[match.id] = data.match?.markets || []
  } catch (value) {
    expandedError.value = value?.data?.statusMessage || value?.message || 'Unable to load full markets.'
  } finally {
    expandedLoading.value = ''
  }
}

async function fetchOdds() {
  loading.value = true
  error.value = ''
  result.value = null
  eventResult.value = null
  expandedId.value = ''
  try {
    if (mode.value === 'league') {
      result.value = await $fetch(`/api/paddypower/${league.value}`)
    } else if (mode.value === 'competition') {
      if (!competitionId.value.trim()) throw new Error('Enter a competition ID.')
      result.value = await $fetch(`/api/paddypower/competition/${competitionId.value.trim()}`)
    } else {
      if (!eventId.value.trim()) throw new Error('Enter an event ID.')
      eventResult.value = await $fetch(`/api/paddypower/event/${eventId.value.trim()}`)
    }
  } catch (value) {
    error.value = value?.data?.statusMessage || value?.message || 'Unable to load odds.'
  } finally {
    loading.value = false
  }
}

function matchOdds(match) {
  return match.markets.find((market) => market.name === 'Match Odds') || match.markets[0]
}
</script>

<template>
  <section class="admin-users-card">
    <div class="admin-users-heading">
      <div>
        <p class="overline">PADDY POWER SCRAPER</p>
        <h2>Test odds endpoints</h2>
        <p>Fetch live fixtures and odds from the Paddy Power scraper.</p>
      </div>
      <div class="pp-tester-controls">
        <select v-model="mode">
          <option v-for="item in modes" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-if="mode === 'league'" v-model="league">
          <option v-for="item in leagues" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <input
          v-else-if="mode === 'competition'"
          v-model="competitionId"
          placeholder="e.g. 117"
          inputmode="numeric"
        />
        <input v-else v-model="eventId" placeholder="e.g. 35974468" inputmode="numeric" />
        <button class="primary-button" type="button" :disabled="loading" @click="fetchOdds">
          <LoadingSpinner v-if="loading" label="Fetching…" inline small />
          <template v-else>Fetch odds</template>
        </button>
      </div>
    </div>

    <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

    <template v-if="result">
      <p class="pp-tester-meta">
        {{ result.matches.length }} matches · fetched {{ new Date(result.fetchedAt).toLocaleTimeString() }}
      </p>

      <div v-if="result.matches.length" class="pp-tester-table-wrap">
        <table class="pp-tester-table">
          <thead>
            <tr>
              <th></th>
              <th>Fixture</th>
              <th>Kick-off</th>
              <th>Market</th>
              <th>Home</th>
              <th>Draw</th>
              <th>Away</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="match in result.matches" :key="match.id">
              <tr class="pp-tester-row" @click="toggleExpand(match)">
                <td class="pp-tester-toggle">{{ expandedId === match.id ? '▾' : '▸' }}</td>
                <td>{{ match.name }}</td>
                <td>{{ new Date(match.startsAt).toLocaleString() }}</td>
                <td>{{ matchOdds(match)?.name || '—' }}</td>
                <td v-for="side in ['home', 'draw', 'away']" :key="side">
                  {{
                    matchOdds(match)?.selections.find((s) =>
                      side === 'draw' ? s.name === 'The Draw' : s.name === match[side]
                    )?.odds || '—'
                  }}
                </td>
              </tr>
              <tr v-if="expandedId === match.id" class="pp-tester-expanded-row">
                <td colspan="7">
                  <LoadingSpinner v-if="expandedLoading === match.id" label="Loading full markets…" inline small />
                  <p v-else-if="expandedError" class="auth-error" role="alert">{{ expandedError }}</p>
                  <p v-else-if="!expandedMarkets[match.id]?.length" class="admin-users-empty">
                    No markets found for this event.
                  </p>
                  <table v-else class="pp-tester-table pp-tester-submarkets">
                    <tbody>
                      <tr v-for="market in expandedMarkets[match.id]" :key="market.name">
                        <td>{{ market.name }}</td>
                        <td class="pp-tester-selections">
                          <span
                            v-for="selection in market.selections"
                            :key="selection.name"
                            class="pp-tester-chip"
                          >
                            {{ selection.name }} {{ selection.odds }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p v-else class="admin-users-empty">No matches found.</p>
    </template>

    <template v-else-if="eventResult">
      <p v-if="!eventResult.match" class="admin-users-empty">No event found for that ID.</p>
      <template v-else>
        <p class="pp-tester-meta">
          {{ eventResult.match.name }} · {{ new Date(eventResult.match.startsAt).toLocaleString() }} ·
          {{ eventResult.match.markets.length }} markets · fetched
          {{ new Date(eventResult.fetchedAt).toLocaleTimeString() }}
        </p>
        <div class="pp-tester-table-wrap">
          <table class="pp-tester-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Selections</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="market in eventResult.match.markets" :key="market.name">
                <td>{{ market.name }}</td>
                <td class="pp-tester-selections">
                  <span v-for="selection in market.selections" :key="selection.name" class="pp-tester-chip">
                    {{ selection.name }} {{ selection.odds }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.pp-tester-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pp-tester-controls select,
.pp-tester-controls input {
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
  background: #fff;
}

.pp-tester-controls input {
  width: 140px;
}

.pp-tester-meta {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.pp-tester-table-wrap {
  margin-top: 14px;
  overflow-x: auto;
}

.pp-tester-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.pp-tester-table th,
.pp-tester-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

.pp-tester-table th {
  color: var(--muted);
  font-weight: 600;
}

.pp-tester-table td:not(.pp-tester-selections) {
  white-space: nowrap;
}

.pp-tester-selections {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pp-tester-chip {
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 999px;
  white-space: nowrap;
}

.pp-tester-row {
  cursor: pointer;
}

.pp-tester-row:hover {
  background: #fafafa;
}

.pp-tester-toggle {
  width: 18px;
  color: var(--muted);
}

.pp-tester-expanded-row td {
  background: #fafafa;
  padding: 10px;
}

.pp-tester-submarkets {
  font-size: 11px;
}

.pp-tester-submarkets td {
  border-bottom: 1px solid #eee;
}

.pp-tester-submarkets tr:last-child td {
  border-bottom: 0;
}

@media (max-width: 760px) {
  .admin-users-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .pp-tester-controls {
    flex-wrap: wrap;
  }
}
</style>
