<script setup>
import { fractionalToDecimal } from '~/lib/odds'
import { BET_MARKETS, getMarketPickOptions, paddyPowerOddsToFractional } from '~/lib/betting'
import { teamNamesMatch, canonicalTeamName } from '~/lib/teamAliases'
import { groupMarketsByCategory } from '~/lib/marketCategories'

const props = defineProps({
  leg: { type: Object, required: true },
  index: { type: Number, required: true },
  open: Boolean,
  canRemove: Boolean,
  liveStatus: { type: String, default: '' }
})
const emit = defineEmits(['toggle', 'update', 'remove'])

const results = ref([])
const searchError = ref('')
const searching = ref(false)
const searchSource = ref('paddypower')
const legMarkets = ref(null)
const activeCategory = ref('')
let searchTimer

function patch(fields) {
  emit('update', { ...props.leg, ...fields })
}

function updateMatch(value) {
  legMarkets.value = null
  activeCategory.value = ''
  patch({
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

function handleMatchInput(value) {
  updateMatch(value)
  clearTimeout(searchTimer)
  results.value = []
  searchError.value = ''
  if (value.trim().length < 2) return
  searchTimer = window.setTimeout(() => searchFixtures(value), 250)
}

async function searchFixtures(query) {
  if (!query?.trim()) return
  searching.value = true
  try {
    if (searchSource.value === 'football') {
      const response = await $fetch('/api/football/fixtures', { query: { q: query } })
      results.value = response.fixtures || []
    } else {
      const response = await $fetch('/api/paddypower/search', { query: { q: query } })
      results.value = response.matches || []
    }
  } catch (error) {
    results.value = []
    searchError.value = error.data?.statusMessage || 'Fixture search is temporarily unavailable.'
  } finally {
    searching.value = false
  }
}

function toggleSource() {
  searchSource.value = searchSource.value === 'football' ? 'paddypower' : 'football'
  results.value = []
  if ((props.leg.match || '').trim().length >= 2) searchFixtures(props.leg.match)
}

async function resolveLiveTracking(match) {
  try {
    const response = await $fetch('/api/football/fixtures', {
      query: { q: canonicalTeamName(match.home) }
    })
    const fixtures = response.fixtures || []
    const matchStart = match.startsAt ? new Date(match.startsAt).getTime() : NaN
    const found = fixtures.find((fixture) => {
      const withinWindow =
        Number.isNaN(matchStart) ||
        !fixture.startsAt ||
        Math.abs(new Date(fixture.startsAt).getTime() - matchStart) < 3 * 60 * 60 * 1000
      return (
        withinWindow &&
        teamNamesMatch(fixture.home, match.home) &&
        teamNamesMatch(fixture.away, match.away)
      )
    })
    if (found && props.leg.match === match.name) {
      patch({ matchId: found.id, provider: found.provider })
    }
  } catch {
    // Live-score linkage is best-effort; odds selection still works without it.
  }
}

function selectResult(item) {
  clearTimeout(searchTimer)
  results.value = []
  if (searchSource.value === 'football') {
    legMarkets.value = null
    activeCategory.value = ''
    patch({
      match: item.label,
      matchId: item.id,
      provider: item.provider,
      competition: item.competition,
      startsAt: item.startsAt,
      home: item.home,
      away: item.away,
      market: '',
      pick: '',
      odds: ''
    })
    return
  }
  legMarkets.value = item.markets || []
  activeCategory.value = groupMarketsByCategory(legMarkets.value)[0]?.key || ''
  patch({
    match: item.name,
    matchId: '',
    provider: '',
    competition: item.competition,
    startsAt: item.startsAt,
    home: item.home,
    away: item.away,
    market: '',
    pick: '',
    odds: ''
  })
  resolveLiveTracking(item)
}

function resultLabel(item) {
  return item.name || item.label
}

function fixtureDate(value) {
  if (!value) return 'date unavailable'
  return new Date(value)
    .toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    .toUpperCase()
}

const marketGroups = computed(() =>
  legMarkets.value ? groupMarketsByCategory(legMarkets.value) : null
)
const activeMarketOptions = computed(() => {
  if (!marketGroups.value) return BET_MARKETS.map((m) => m.label)
  const group = marketGroups.value.find((item) => item.key === activeCategory.value)
  return (group || marketGroups.value[0])?.markets.map((market) => market.name) || []
})

function selectCategory(key) {
  activeCategory.value = key
}
const pickOptions = computed(() => {
  if (legMarkets.value) {
    const market = legMarkets.value.find((item) => item.name === props.leg.market)
    return market ? market.selections.map((selection) => selection.name) : []
  }
  return getMarketPickOptions(props.leg)
})

function pickMarket(value) {
  const fields = { market: value, pick: '' }
  if (legMarkets.value) fields.odds = ''
  patch(fields)
}

function pickPick(value) {
  if (legMarkets.value) {
    const market = legMarkets.value.find((item) => item.name === props.leg.market)
    const selection = market?.selections.find((item) => item.name === value)
    if (selection) {
      patch({ pick: value, odds: paddyPowerOddsToFractional(selection.odds) })
      return
    }
  }
  patch({ pick: value })
}

const decimal = computed(() => {
  const value = fractionalToDecimal(props.leg.odds)
  return value ? value.toFixed(2) : '—'
})

onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div class="builder-leg" :class="{ open }">
    <button type="button" class="builder-leg-summary" @click="$emit('toggle')">
      <span class="builder-leg-index">{{ index + 1 }}</span>
      <span class="builder-leg-main">
        <span class="builder-leg-match">{{ leg.match || 'Add a match' }}</span>
        <span class="builder-leg-detail"
          >{{ leg.market }} <template v-if="leg.pick">&middot; {{ leg.pick }}</template></span
        >
      </span>
      <span v-if="leg.matchId" class="leg-live-badge linked">&#9679; Live tracked</span>
      <span v-else-if="liveStatus === 'not-found'" class="leg-live-badge unlinked">No live match found</span>
      <span class="builder-leg-odds">{{ leg.odds }}</span>
    </button>

    <div v-if="open" class="builder-leg-body">
      <div class="builder-field-label">FIXTURE</div>
      <input
        :value="leg.match"
        placeholder="Match, e.g. Arsenal v Chelsea"
        @input="handleMatchInput($event.target.value)"
      />
      <p v-if="leg.matchId" class="builder-hint leg-live-hint">&#9679; Linked to live scores</p>
      <p v-else-if="liveStatus === 'not-found'" class="builder-error">
        Couldn't auto-link this match to live scores &mdash; search and reselect it below.
      </p>
      <p v-if="searching" class="builder-hint">Searching fixtures&hellip;</p>
      <p v-else-if="searchError" class="builder-error">{{ searchError }}</p>
      <div v-if="results.length" class="builder-suggestions">
        <button
          v-for="item in results"
          :key="item.id || item.name"
          type="button"
          class="builder-suggestion"
          @click="selectResult(item)"
        >
          <span>{{ resultLabel(item) }}</span>
          <span class="mono-meta"
            >{{ item.competition }} &middot; {{ fixtureDate(item.startsAt) }}</span
          >
        </button>
      </div>
      <button type="button" class="builder-source-toggle" @click="toggleSource">
        {{
          searchSource === 'football'
            ? '← Back to Paddy Power odds'
            : "Can't find it? Search all fixtures instead"
        }}
      </button>

      <div class="builder-field-label">MARKET</div>
      <div v-if="marketGroups" class="builder-chip-row builder-category-row">
        <button
          v-for="group in marketGroups"
          :key="group.key"
          type="button"
          class="pill-chip category-chip"
          :class="{ active: group.key === activeCategory }"
          @click="selectCategory(group.key)"
        >
          {{ group.label }}
        </button>
      </div>
      <div class="builder-chip-row">
        <button
          v-for="market in activeMarketOptions"
          :key="market"
          type="button"
          class="pill-chip"
          :class="{ active: market === leg.market }"
          @click="pickMarket(market)"
        >
          {{ market }}
        </button>
      </div>

      <template v-if="leg.market">
        <div class="builder-field-label">PICK</div>
        <div v-if="pickOptions.length" class="builder-chip-row">
          <button
            v-for="pick in pickOptions"
            :key="pick"
            type="button"
            class="pill-chip"
            :class="{ active: pick === leg.pick }"
            @click="pickPick(pick)"
          >
            {{ pick }}
          </button>
        </div>
        <input
          v-else
          :value="leg.pick"
          :placeholder="leg.market === 'Correct score' ? 'e.g. 2-1' : 'Select match first'"
          @input="patch({ pick: $event.target.value })"
        />
      </template>

      <div class="builder-odds-row">
        <label class="builder-odds-field">
          <span class="builder-field-label">FRACTIONAL ODDS</span>
          <input
            :value="leg.odds"
            placeholder="1/2"
            @input="patch({ odds: $event.target.value })"
          />
        </label>
        <div class="builder-decimal-readout">{{ decimal }}</div>
        <button v-if="canRemove" type="button" class="builder-remove" @click="$emit('remove')">
          Remove
        </button>
      </div>
    </div>
  </div>
</template>
