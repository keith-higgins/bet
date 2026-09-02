<script setup>
import { BET_MARKETS, getMarketPickOptions, paddyPowerOddsToFractional } from '~/lib/betting'
import { teamNamesMatch } from '~/lib/teamAliases'

const props = defineProps({ legs: { type: Array, default: () => [] } })
const emit = defineEmits(['update:legs', 'add', 'remove'])
const results = ref({})
const searchErrors = ref({})
const searching = ref(null)
const searchTimers = {}
const searchSource = ref({})
const legMarkets = ref({})

function update(index, key, value) {
  emit(
    'update:legs',
    props.legs.map((leg, itemIndex) => (itemIndex === index ? { ...leg, [key]: value } : leg))
  )
}
function patchLeg(index, patch) {
  emit(
    'update:legs',
    props.legs.map((leg, itemIndex) => (itemIndex === index ? { ...leg, ...patch } : leg))
  )
}
function updateMatch(index, value) {
  legMarkets.value = { ...legMarkets.value, [index]: null }
  patchLeg(index, {
    match: value,
    matchId: '',
    provider: '',
    home: '',
    away: '',
    market: '',
    pick: '',
    odds: ''
  })
}
function updateMarket(index, value) {
  const patch = { market: value, pick: '' }
  if (legMarkets.value[index]) patch.odds = ''
  patchLeg(index, patch)
}
function handleMatchInput(index, value) {
  updateMatch(index, value)
  clearTimeout(searchTimers[index])
  results.value = { ...results.value, [index]: [] }
  searchErrors.value = { ...searchErrors.value, [index]: '' }
  if (value.trim().length < 2) return
  searchTimers[index] = window.setTimeout(() => searchFixtures(index, value), 250)
}
async function searchFixtures(index, query) {
  if (!query?.trim()) return
  searching.value = index
  const usingFootball = searchSource.value[index] === 'football'
  try {
    if (usingFootball) {
      const response = await $fetch('/api/football/fixtures', { query: { q: query } })
      results.value = { ...results.value, [index]: response.fixtures || [] }
    } else {
      const response = await $fetch('/api/paddypower/search', { query: { q: query } })
      results.value = { ...results.value, [index]: response.matches || [] }
    }
  } catch (error) {
    results.value = { ...results.value, [index]: [] }
    searchErrors.value = {
      ...searchErrors.value,
      [index]: error.data?.statusMessage || 'Fixture search is temporarily unavailable.'
    }
  } finally {
    searching.value = null
  }
}
function toggleSource(index) {
  searchSource.value = {
    ...searchSource.value,
    [index]: searchSource.value[index] === 'football' ? 'paddypower' : 'football'
  }
  results.value = { ...results.value, [index]: [] }
  const currentMatch = props.legs[index]?.match || ''
  if (currentMatch.trim().length >= 2) searchFixtures(index, currentMatch)
}
async function resolveLiveTracking(index, match) {
  try {
    const response = await $fetch('/api/football/fixtures', { query: { q: match.home } })
    const fixtures = response.fixtures || []
    const matchStart = match.startsAt ? new Date(match.startsAt).getTime() : NaN
    const found = fixtures.find((fixture) => {
      const withinWindow =
        Number.isNaN(matchStart) ||
        !fixture.startsAt ||
        Math.abs(new Date(fixture.startsAt).getTime() - matchStart) < 3 * 60 * 60 * 1000
      return (
        withinWindow && teamNamesMatch(fixture.home, match.home) && teamNamesMatch(fixture.away, match.away)
      )
    })
    if (found && props.legs[index]?.match === match.name) {
      patchLeg(index, { matchId: found.id, provider: found.provider })
    }
  } catch {
    // Live-score linkage is best-effort; odds selection still works without it.
  }
}
function selectPaddyPowerMatch(index, match) {
  clearTimeout(searchTimers[index])
  legMarkets.value = { ...legMarkets.value, [index]: match.markets || [] }
  patchLeg(index, {
    match: match.name,
    matchId: '',
    provider: '',
    competition: match.competition,
    startsAt: match.startsAt,
    home: match.home,
    away: match.away,
    market: '',
    pick: '',
    odds: ''
  })
  results.value = { ...results.value, [index]: [] }
  resolveLiveTracking(index, match)
}
function selectFootballFixture(index, fixture) {
  clearTimeout(searchTimers[index])
  legMarkets.value = { ...legMarkets.value, [index]: null }
  patchLeg(index, {
    match: fixture.label,
    matchId: fixture.id,
    provider: fixture.provider,
    competition: fixture.competition,
    startsAt: fixture.startsAt,
    home: fixture.home,
    away: fixture.away,
    market: '',
    pick: '',
    odds: ''
  })
  results.value = { ...results.value, [index]: [] }
}
function selectResult(index, item) {
  if (searchSource.value[index] === 'football') selectFootballFixture(index, item)
  else selectPaddyPowerMatch(index, item)
}
function updatePick(index, value) {
  const markets = legMarkets.value[index]
  const leg = props.legs[index]
  if (markets && leg) {
    const market = markets.find((item) => item.name === leg.market)
    const selection = market?.selections.find((item) => item.name === value)
    if (selection) {
      patchLeg(index, { pick: value, odds: paddyPowerOddsToFractional(selection.odds) })
      return
    }
  }
  update(index, 'pick', value)
}
onBeforeUnmount(() => Object.values(searchTimers).forEach(clearTimeout))
function fixtureDate(value) {
  if (!value) return 'Date unavailable'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
function marketOptions(index) {
  const markets = legMarkets.value[index]
  return markets ? markets.map((market) => market.name) : BET_MARKETS.map((market) => market.label)
}
function pickOptions(leg, index) {
  const markets = legMarkets.value[index]
  if (markets) {
    const market = markets.find((item) => item.name === leg.market)
    return market ? market.selections.map((selection) => selection.name) : []
  }
  return getMarketPickOptions(leg)
}
function resultLabel(item) {
  return item.name || item.label
}
</script>

<template>
  <div class="legs-editor">
    <div class="legs-heading">
      <div>
        <strong>Accumulator legs</strong><small>Add every match and pick in your bet.</small>
      </div>
      <button class="outline-button" type="button" @click="$emit('add')">＋ Add leg</button>
    </div>
    <div v-for="(leg, index) in legs" :key="index" class="leg-row">
      <div class="leg-number">{{ index + 1 }}</div>
      <div class="leg-fields">
        <label class="sr-only" :for="`match-${index}`">Match {{ index + 1 }}</label
        ><input
          :id="`match-${index}`"
          :value="leg.match"
          placeholder="Match, e.g. Arsenal v Chelsea"
          @input="handleMatchInput(index, $event.target.value)"
        />
        <span v-if="searching === index" class="fixture-search-status"
          ><LoadingSpinner label="Searching fixtures…" inline small
        /></span>
        <small v-if="searchErrors[index]" class="fixture-search-error">{{
          searchErrors[index]
        }}</small>
        <div v-if="results[index]?.length" class="fixture-results">
          <button
            v-for="item in results[index]"
            :key="item.id"
            type="button"
            class="fixture-result"
            @click="selectResult(index, item)"
          >
            <strong>{{ resultLabel(item) }}</strong
            ><small>{{ item.competition }} · {{ fixtureDate(item.startsAt) }}</small>
          </button>
        </div>
        <button type="button" class="source-toggle" @click="toggleSource(index)">
          {{
            searchSource[index] === 'football'
              ? '← Back to Paddy Power odds'
              : "Can't find it? Search all fixtures instead"
          }}
        </button>
        <div class="leg-subfields">
          <label class="sr-only" :for="`market-${index}`">Market {{ index + 1 }}</label
          ><select
            :id="`market-${index}`"
            :value="leg.market"
            @change="updateMarket(index, $event.target.value)"
          >
            <option value="">Choose market</option>
            <option v-for="market in marketOptions(index)" :key="market" :value="market">
              {{ market }}
            </option></select
          ><label class="sr-only" :for="`pick-${index}`">Pick {{ index + 1 }}</label
          ><select
            v-if="pickOptions(leg, index).length"
            :id="`pick-${index}`"
            :value="leg.pick"
            @change="updatePick(index, $event.target.value)"
          >
            <option value="">Choose pick</option>
            <option v-for="pick in pickOptions(leg, index)" :key="pick" :value="pick">
              {{ pick }}
            </option></select
          ><input
            v-else
            :id="`pick-${index}`"
            :value="leg.pick"
            :placeholder="leg.market === 'Correct score' ? 'e.g. 2-1' : 'Select match first'"
            @input="update(index, 'pick', $event.target.value)"
          /><label class="sr-only" :for="`odds-${index}`">Fractional odds {{ index + 1 }}</label
          ><input
            :id="`odds-${index}`"
            :value="leg.odds"
            type="text"
            inputmode="text"
            placeholder="1/2"
            aria-label="Fractional odds"
            @input="update(index, 'odds', $event.target.value)"
          /><button
            v-if="legs.length > 1"
            class="remove-leg"
            type="button"
            :aria-label="`Remove leg ${index + 1}`"
            @click="$emit('remove', index)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fixture-search-status {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: 9px;
}

.fixture-search-error {
  display: block;
  margin-top: 6px;
  color: var(--red);
  font-size: 9px;
}

.fixture-results {
  display: grid;
  gap: 5px;
  margin-top: 7px;
}

.fixture-result {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fafaff;
  color: var(--ink);
  text-align: left;
}

.fixture-result strong,
.fixture-result small {
  display: block;
}

.fixture-result strong {
  font-size: 10px;
}

.fixture-result small {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 9px;
}

.source-toggle {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: 9px;
  text-decoration: underline;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
</style>
