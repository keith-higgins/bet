<script setup>
import { BET_MARKETS, getMarketPickOptions } from '~/lib/betting'

const props = defineProps({ legs: { type: Array, default: () => [] } })
const emit = defineEmits(['update:legs', 'add', 'remove'])
const results = ref({})
const searching = ref(null)
const searchTimers = {}

function update(index, key, value) {
  emit(
    'update:legs',
    props.legs.map((leg, itemIndex) => (itemIndex === index ? { ...leg, [key]: value } : leg))
  )
}
function updateMatch(index, value) {
  emit(
    'update:legs',
    props.legs.map((leg, itemIndex) =>
      itemIndex === index
        ? { ...leg, match: value, matchId: '', provider: '', home: '', away: '', pick: '' }
        : leg
    )
  )
}
function updateMarket(index, value) {
  emit(
    'update:legs',
    props.legs.map((leg, itemIndex) =>
      itemIndex === index ? { ...leg, market: value, pick: '' } : leg
    )
  )
}
function handleMatchInput(index, value) {
  updateMatch(index, value)
  clearTimeout(searchTimers[index])
  results.value = { ...results.value, [index]: [] }
  if (value.trim().length < 2) return
  searchTimers[index] = window.setTimeout(() => searchFixtures(index, value), 250)
}
async function searchFixtures(index, query) {
  if (!query?.trim()) return
  searching.value = index
  try {
    const response = await $fetch('/api/football/fixtures', { query: { q: query } })
    results.value = { ...results.value, [index]: response.fixtures || [] }
  } catch {
    results.value = { ...results.value, [index]: [] }
  } finally {
    searching.value = null
  }
}
function selectFixture(index, fixture) {
  clearTimeout(searchTimers[index])
  emit(
    'update:legs',
    props.legs.map((leg, itemIndex) =>
      itemIndex === index
        ? {
            ...leg,
            match: fixture.label,
            matchId: fixture.id,
            provider: fixture.provider,
            competition: fixture.competition,
            startsAt: fixture.startsAt,
            home: fixture.home,
            away: fixture.away,
            pick: ''
          }
        : leg
    )
  )
  results.value = { ...results.value, [index]: [] }
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
function pickOptions(leg) {
  return getMarketPickOptions(leg)
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
        <div v-if="results[index]?.length" class="fixture-results">
          <button
            v-for="fixture in results[index]"
            :key="fixture.id"
            type="button"
            class="fixture-result"
            @click="selectFixture(index, fixture)"
          >
            <strong>{{ fixture.label }}</strong
            ><small>{{ fixture.competition }} · {{ fixtureDate(fixture.startsAt) }}</small>
          </button>
        </div>
        <div class="leg-subfields">
          <label class="sr-only" :for="`market-${index}`">Market {{ index + 1 }}</label
          ><select
            :id="`market-${index}`"
            :value="leg.market"
            @change="updateMarket(index, $event.target.value)"
          >
            <option v-for="market in BET_MARKETS" :key="market.databaseValue" :value="market.label">
              {{ market.label }}
            </option></select
          ><label class="sr-only" :for="`pick-${index}`">Pick {{ index + 1 }}</label
          ><select
            v-if="pickOptions(leg).length"
            :id="`pick-${index}`"
            :value="leg.pick"
            @change="update(index, 'pick', $event.target.value)"
          >
            <option value="">Choose pick</option>
            <option v-for="pick in pickOptions(leg)" :key="pick" :value="pick">
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
</style>
