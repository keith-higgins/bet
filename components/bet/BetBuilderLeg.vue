<script setup>
import { fractionalToDecimal } from '~/lib/odds'
import { BET_MARKETS, getMarketPickOptions, paddyPowerOddsToFractional } from '~/lib/betting'
import { groupMarketsByCategory } from '~/lib/marketCategories'

const props = defineProps({
  leg: { type: Object, required: true },
  index: { type: Number, required: true },
  open: Boolean,
  canRemove: Boolean,
  builderMode: Boolean,
  matchLocked: Boolean,
  sharedMarkets: { type: Array, default: null },
  liveStatus: { type: String, default: '' }
})
const emit = defineEmits(['toggle', 'update', 'remove', 'matched'])

const results = ref([])
const searchError = ref('')
const searching = ref(false)
const searchSource = ref('paddypower')
const ownMarkets = ref(null)
// A match-locked leg (Bet Builder, leg 2+) never searches for itself, so it always
// needs the shared list. Leg 0 prefers its own search result if it has one, but falls
// back to the shared list too — e.g. after a screenshot upload resolves the match at
// the page level rather than through this component's own search.
const legMarkets = computed(() => ownMarkets.value || props.sharedMarkets)
const activeCategory = ref('')
let searchTimer

// Whenever the market list arrives (from a manual search, a screenshot resolving the
// shared match, or leg 2+ inheriting leg 0's list), jump to whichever category tab
// actually contains this leg's current market — not just the first tab — so an
// already-parsed market like "To Be Shown A Card" is visible and shows as selected
// instead of silently sitting in a category tab that was never opened.
watch(
  legMarkets,
  (markets) => {
    if (!markets) return
    const groups = groupMarketsByCategory(markets)
    const matchingGroup = groups.find((group) =>
      group.markets.some((market) => market.name === props.leg.market)
    )
    activeCategory.value = matchingGroup?.key || groups[0]?.key || ''
  },
  { immediate: true }
)

function patch(fields) {
  emit('update', { ...props.leg, ...fields })
}

function updateMatch(value) {
  ownMarkets.value = null
  activeCategory.value = ''
  emit('matched', null)
  patch({
    match: value,
    matchId: '',
    provider: '',
    home: '',
    away: '',
    market: '',
    pick: '',
    ...(props.leg.oddsFromSlip ? {} : { odds: '' })
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
    const response = await $fetch('/api/football/match', {
      query: { home: match.home, away: match.away, startsAt: match.startsAt || '' }
    })
    const found = response.fixture
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
    ownMarkets.value = null
    activeCategory.value = ''
    emit('matched', null)
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
      ...(props.leg.oddsFromSlip ? {} : { odds: '' })
    })
    return
  }
  ownMarkets.value = item.markets || []
  emit('matched', ownMarkets.value)
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
    ...(props.leg.oddsFromSlip ? {} : { odds: '' })
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
  if (key === activeCategory.value) return
  activeCategory.value = key
  // Switching category tabs alone left the old market (and its pick options, e.g.
  // player names for "Anytime Goalscorer") selected underneath until a new market
  // chip was actually clicked — clear it now unless the current market also happens
  // to live in the category just switched to.
  const marketNames =
    marketGroups.value?.find((group) => group.key === key)?.markets.map((market) => market.name) || []
  if (props.leg.market && !marketNames.includes(props.leg.market)) {
    pickMarket('')
  }
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
  if (legMarkets.value && !props.leg.oddsFromSlip) fields.odds = ''
  patch(fields)
}

function pickPick(value) {
  if (legMarkets.value) {
    const market = legMarkets.value.find((item) => item.name === props.leg.market)
    const selection = market?.selections.find((item) => item.name === value)
    if (selection) {
      const nextPatch = { pick: value }
      if (!props.leg.oddsFromSlip) nextPatch.odds = paddyPowerOddsToFractional(selection.odds)
      patch(nextPatch)
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
      <span v-if="!builderMode" class="builder-leg-odds">{{ leg.odds }}</span>
    </button>

    <div v-if="open" class="builder-leg-body">
      <template v-if="matchLocked">
        <div class="builder-field-label">FIXTURE</div>
        <p class="builder-hint">{{ leg.match }} &mdash; same match as leg 1</p>
      </template>
      <template v-else>
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
      </template>

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
        <label v-if="!builderMode" class="builder-odds-field">
          <span class="builder-field-label">FRACTIONAL ODDS</span>
          <input
            :value="leg.odds"
            placeholder="1/2"
            @input="patch({ odds: $event.target.value, oddsFromSlip: false })"
          />
        </label>
        <div v-if="!builderMode" class="builder-decimal-readout">{{ decimal }}</div>
        <button v-if="canRemove" type="button" class="builder-remove" @click="$emit('remove')">
          Remove
        </button>
      </div>
    </div>
  </div>
</template>
