<script setup>
import { decimalToFractional, fractionalToDecimal, isValidFractionalOdds, resolveCombinedOdds } from '~/lib/odds'
import { teamNamesMatch, normalizeTeamName, canonicalTeamName } from '~/lib/teamAliases'
import { paddyPowerOddsToFractional, resolveMarketDatabaseValue } from '~/lib/betting'

const dashboard = reactive(useDashboard())

onMounted(() => {
  if (!dashboard.canManageCurrentBet) navigateTo('/')
})

const draftStake = ref(dashboard.stake || 20)
const draftLegs = ref([])
const draftBetType = ref(dashboard.bet.type || 'Accumulator')
const draftCombinedOdds = ref('10/1')
const openLeg = ref(0)
const error = ref('')
const saving = ref(false)
const entryMode = ref(dashboard.legs.length ? 'manual' : 'upload')
const liveStatus = ref({})
// Bet Builder legs after the first don't search for their own match — they reuse
// whichever Paddy Power market list the first leg's match search resolved.
const builderMarkets = ref(null)

function blankLeg() {
  return { match: '', market: '', pick: '', odds: '', status: 'pending' }
}

// In Bet Builder mode every leg shares the first leg's match — reuse it instead of
// starting a fresh, unlinked leg.
function nextLeg() {
  if (draftBetType.value !== 'BetBuilder') return blankLeg()
  const anchor = draftLegs.value[0]
  if (!anchor?.match) return blankLeg()
  const { match, matchId, provider, home, away, startsAt, competition } = anchor
  return { match, matchId, provider, home, away, startsAt, competition, market: '', pick: '', odds: '', status: 'pending' }
}

// Re-sync the draft whenever the active bet changes — switching tabs while
// already on this screen doesn't remount it, so this can't be a one-shot seed.
watch(
  () => dashboard.activeBetId,
  () => {
    draftStake.value = dashboard.stake || 20
    draftBetType.value = dashboard.bet.type || 'Accumulator'
    draftCombinedOdds.value =
      draftBetType.value === 'BetBuilder' && dashboard.bet.combinedOdds
        ? decimalToFractional(dashboard.bet.combinedOdds)
        : '10/1'
    draftLegs.value = dashboard.legs.length
      ? dashboard.legs.map((leg) => ({ ...leg, odds: decimalToFractional(leg.odds) }))
      : [blankLeg()]
    openLeg.value = 0
    liveStatus.value = {}
    entryMode.value = dashboard.legs.length ? 'manual' : 'upload'
  },
  { immediate: true }
)

const betPosition = computed(() => {
  const savedCount = dashboard.userBets.length
  if (!dashboard.activeBetId) return { n: savedCount + 1, total: savedCount + 1 }
  const index = dashboard.userBets.findIndex((item) => item.id === dashboard.activeBetId)
  return { n: index === -1 ? savedCount + 1 : index + 1, total: savedCount }
})
const weekStakedTotal = computed(() => {
  const others = dashboard.userBets.filter((item) => item.id !== dashboard.activeBetId)
  const othersTotal = others.reduce((total, item) => total + Number(item.stake || 0), 0)
  return othersTotal + Number(draftStake.value || 0)
})

async function resolveLiveTracking(index, leg) {
  if (!leg.home || !leg.away) {
    liveStatus.value = { ...liveStatus.value, [index]: 'not-found' }
    return
  }
  try {
    // The football provider's search is picky about short/abbreviated names (e.g.
    // "Newcastle" alone matches an unrelated Australian club) — search on the fuller
    // canonical name from our alias table instead of the raw slip text.
    const response = await $fetch('/api/football/fixtures', {
      query: { q: canonicalTeamName(leg.home) }
    })
    const fixtures = response.fixtures || []
    const matchStart = leg.startsAt ? new Date(leg.startsAt).getTime() : NaN
    const found = fixtures.find((fixture) => {
      const withinWindow =
        Number.isNaN(matchStart) ||
        !fixture.startsAt ||
        Math.abs(new Date(fixture.startsAt).getTime() - matchStart) < 3 * 60 * 60 * 1000
      return (
        withinWindow &&
        teamNamesMatch(fixture.home, leg.home) &&
        teamNamesMatch(fixture.away, leg.away)
      )
    })
    if (found && draftLegs.value[index]?.match === leg.match) {
      draftLegs.value = draftLegs.value.map((item, i) =>
        i === index ? { ...item, matchId: found.id, provider: found.provider } : item
      )
      liveStatus.value = { ...liveStatus.value, [index]: 'linked' }
    } else {
      liveStatus.value = { ...liveStatus.value, [index]: 'not-found' }
    }
  } catch {
    liveStatus.value = { ...liveStatus.value, [index]: 'not-found' }
  }
}

// Snaps an OCR'd market/pick onto Paddy Power's canonical selection name when we can
// find the same fixture there — this fixes up settlement categorization (which relies
// on PP's exact market labels). Odds extracted from a screenshot are authoritative and
// are only replaced with a live price when they didn't come from a screenshot.
async function resolvePaddyPowerMarket(index, leg) {
  if (!leg.home || !leg.away) return
  try {
    const response = await $fetch('/api/paddypower/search', { query: { q: leg.home } })
    const matches = response.matches || []
    const matchStart = leg.startsAt ? new Date(leg.startsAt).getTime() : NaN
    const found = matches.find((item) => {
      const withinWindow =
        Number.isNaN(matchStart) ||
        !item.startsAt ||
        Math.abs(new Date(item.startsAt).getTime() - matchStart) < 3 * 60 * 60 * 1000
      return (
        withinWindow && teamNamesMatch(item.home, leg.home) && teamNamesMatch(item.away, leg.away)
      )
    })
    if (!found) return

    const targetValue = resolveMarketDatabaseValue(leg.market)
    const market = (found.markets || []).find(
      (item) => resolveMarketDatabaseValue(item.name) === targetValue
    )
    if (!market) return

    const normalizedPick = normalizeTeamName(leg.pick)
    const selection = market.selections.find(
      (item) => normalizeTeamName(item.name) === normalizedPick || teamNamesMatch(item.name, leg.pick)
    )
    if (!selection) return

    if (draftLegs.value[index]?.match === leg.match) {
      const current = draftLegs.value[index]
      const liveOdds = paddyPowerOddsToFractional(selection.odds)
      const patch = { pick: selection.name, competition: found.competition, startsAt: found.startsAt }
      // Keep our already-canonicalized market label (matches the pill chip text). Only
      // fall back to a live price when this leg's odds didn't come from a screenshot —
      // screenshot odds are authoritative and must not be silently replaced.
      if (!current.oddsFromSlip && isValidFractionalOdds(liveOdds)) patch.odds = liveOdds
      draftLegs.value = draftLegs.value.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }
  } catch {
    // Best-effort — the OCR'd market/pick/odds still work without a live match.
  }
}

// A Bet Builder slip shows one match once, with every leg just a market+pick against it
// and no per-leg odds — link the shared match once and apply it to every leg.
async function resolveBuilderMatchTracking(match) {
  if (!match.home || !match.away) return
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
        withinWindow && teamNamesMatch(fixture.home, match.home) && teamNamesMatch(fixture.away, match.away)
      )
    })
    liveStatus.value = { 0: found ? 'linked' : 'not-found' }
    if (found) {
      draftLegs.value = draftLegs.value.map((leg) => ({
        ...leg,
        matchId: found.id,
        provider: found.provider
      }))
    }
  } catch {
    liveStatus.value = { 0: 'not-found' }
  }
}

function applyParsedSlip(result) {
  if (result.stake) draftStake.value = result.stake
  if (draftBetType.value === 'BetBuilder') {
    draftCombinedOdds.value = result.combinedOdds || draftCombinedOdds.value
    draftLegs.value = result.legs.map((leg) => ({
      match: result.match,
      matchId: '',
      provider: '',
      home: result.home,
      away: result.away,
      startsAt: result.startsAt || '',
      market: leg.market,
      pick: leg.pick,
      odds: '',
      status: 'pending'
    }))
    openLeg.value = -1
    entryMode.value = 'manual'
    liveStatus.value = {}
    resolveBuilderMatchTracking({ home: result.home, away: result.away, startsAt: result.startsAt })
    return
  }
  draftLegs.value = result.legs.map((leg) => ({
    match: leg.match,
    market: leg.market,
    pick: leg.pick,
    odds: leg.odds,
    oddsFromSlip: true,
    status: 'pending'
  }))
  openLeg.value = -1
  entryMode.value = 'manual'
  liveStatus.value = {}
  result.legs.forEach((leg, index) => {
    resolvePaddyPowerMarket(index, leg)
    resolveLiveTracking(index, leg)
  })
}

const combinedOdds = computed(() =>
  resolveCombinedOdds(
    { type: draftBetType.value, combinedOdds: fractionalToDecimal(draftCombinedOdds.value) },
    draftLegs.value
  )
)
const potentialReturn = computed(() => Number(draftStake.value || 0) * combinedOdds.value)

const stakeChips = [10, 20, 50]

function adjustStake(delta) {
  draftStake.value = Math.max(1, Number(draftStake.value || 0) + delta)
}

function updateLeg(index, value) {
  if (draftLegs.value[index]?.match !== value.match) {
    const { [index]: _removed, ...rest } = liveStatus.value
    liveStatus.value = rest
  }
  draftLegs.value = draftLegs.value.map((leg, i) => (i === index ? value : leg))
}

function addLeg() {
  draftLegs.value = [...draftLegs.value, nextLeg()]
  openLeg.value = draftLegs.value.length - 1
}

function removeLeg(index) {
  draftLegs.value = draftLegs.value.filter((_, i) => i !== index)
  liveStatus.value = {}
  openLeg.value = -1
}

function toggleLeg(index) {
  openLeg.value = openLeg.value === index ? -1 : index
}

function setBetType(type) {
  if (draftBetType.value === type) return
  draftBetType.value = type
  draftLegs.value = [blankLeg()]
  draftCombinedOdds.value = '10/1'
  liveStatus.value = {}
  builderMarkets.value = null
  openLeg.value = 0
}

async function save(andStartAnother = false) {
  error.value = ''
  if (!draftStake.value || Number(draftStake.value) < 1) {
    error.value = 'Enter a stake of at least €1.'
    return
  }
  if (draftBetType.value === 'BetBuilder') {
    if (!draftLegs.value[0]?.match?.trim()) {
      error.value = 'Choose the match this bet builder is for.'
      return
    }
    if (draftLegs.value.some((leg) => !leg.market.trim() || !leg.pick.trim())) {
      error.value = 'Complete every leg with a market and a pick.'
      return
    }
    if (!isValidFractionalOdds(draftCombinedOdds.value)) {
      error.value = 'Enter valid combined odds for this bet builder, such as 11/1.'
      return
    }
  } else if (
    draftLegs.value.some(
      (leg) => !leg.match.trim() || !leg.pick.trim() || !isValidFractionalOdds(leg.odds)
    )
  ) {
    error.value =
      'Complete every selection with a match, pick, and valid fractional odds, such as 1/2.'
    return
  }
  saving.value = true
  const saved = await dashboard.saveBet({
    stake: Number(draftStake.value),
    betType: draftBetType.value,
    combinedOdds:
      draftBetType.value === 'BetBuilder' ? fractionalToDecimal(draftCombinedOdds.value) : undefined,
    legs: draftLegs.value.map((leg) => ({
      ...leg,
      odds: draftBetType.value === 'BetBuilder' ? 1 : fractionalToDecimal(leg.odds)
    }))
  })
  saving.value = false
  if (!saved) return
  if (andStartAnother) dashboard.startNewBet()
  else navigateTo('/')
}
</script>

<template>
  <div class="builder-page">
    <div class="builder-header">
      <div>
        <p class="screen-overline" style="margin-bottom: 9px">
          {{ dashboard.round.title }} &middot; BET {{ betPosition.n }} OF {{ betPosition.total }}
        </p>
        <h2 class="builder-title">Build a bet</h2>
      </div>
      <button class="builder-close" type="button" aria-label="Close" @click="navigateTo('/')">
        &times;
      </button>
    </div>

    <div v-if="dashboard.userBets.length" class="bet-tabs">
      <button
        v-for="(item, index) in dashboard.userBets"
        :key="item.id"
        type="button"
        class="pill-chip bet-tab"
        :class="{ active: item.id === dashboard.activeBetId }"
        @click="dashboard.selectBet(item.id)"
      >
        Bet {{ index + 1 }}
      </button>
      <button
        type="button"
        class="pill-chip bet-tab bet-tab-new"
        :class="{ active: !dashboard.activeBetId }"
        @click="dashboard.startNewBet()"
      >
        &#65291; New bet
      </button>
    </div>

    <div class="stake-card">
      <div class="builder-summary-row" style="margin-bottom: 0">
        <p class="builder-field-label">STAKE ON THIS BET</p>
        <span class="mono-meta">{{ dashboard.money(weekStakedTotal) }} ACROSS {{ betPosition.total }} BET{{ betPosition.total === 1 ? '' : 'S' }}</span>
      </div>
      <div class="stake-stepper">
        <button type="button" class="stepper-button" @click="adjustStake(-5)">&minus;</button>
        <div class="stake-value">{{ dashboard.money(draftStake) }}</div>
        <button type="button" class="stepper-button" @click="adjustStake(5)">&#65291;</button>
      </div>
      <div class="stake-chips">
        <button
          v-for="chip in stakeChips"
          :key="chip"
          type="button"
          class="pill-chip stake-chip"
          :class="{ active: draftStake === chip }"
          @click="draftStake = chip"
        >
          &euro;{{ chip }}
        </button>
      </div>
    </div>

    <div class="mini-heading">
      <h3>Bet type</h3>
    </div>
    <div class="entry-mode-toggle">
      <button
        type="button"
        class="text-button"
        :class="{ active: draftBetType === 'Accumulator' }"
        @click="setBetType('Accumulator')"
      >
        Accumulator
      </button>
      <button
        type="button"
        class="text-button"
        :class="{ active: draftBetType === 'BetBuilder' }"
        @click="setBetType('BetBuilder')"
      >
        Bet builder
      </button>
    </div>
    <p class="builder-hint">
      {{
        draftBetType === 'BetBuilder'
          ? 'One match, multiple markets — e.g. Man Utd to win and Bruno Fernandes to be booked.'
          : 'Multiple matches, one pick each.'
      }}
    </p>

    <div class="mini-heading">
      <h3>Legs</h3>
      <span class="mono-meta">TAP TO EDIT</span>
    </div>
    <div class="entry-mode-toggle">
      <button
        type="button"
        class="text-button"
        :class="{ active: entryMode === 'upload' }"
        @click="entryMode = 'upload'"
      >
        Upload slip
      </button>
      <button
        type="button"
        class="text-button"
        :class="{ active: entryMode === 'manual' }"
        @click="entryMode = 'manual'"
      >
        Enter manually
      </button>
    </div>
    <BetSlipUpload v-if="entryMode === 'upload'" :bet-type="draftBetType" @parsed="applyParsedSlip" />
    <template v-else>
      <div class="builder-legs">
        <BetBuilderLeg
          v-for="(leg, index) in draftLegs"
          :key="index"
          :leg="leg"
          :index="index"
          :open="openLeg === index"
          :can-remove="draftLegs.length > 1"
          :builder-mode="draftBetType === 'BetBuilder'"
          :match-locked="draftBetType === 'BetBuilder' && index > 0"
          :shared-markets="builderMarkets"
          :live-status="liveStatus[index] || ''"
          @toggle="toggleLeg(index)"
          @update="updateLeg(index, $event)"
          @remove="removeLeg(index)"
          @matched="builderMarkets = $event"
        />
      </div>
      <button type="button" class="builder-add-leg" @click="addLeg">
        &#65291; {{ draftBetType === 'BetBuilder' ? 'Add another market' : 'Add another leg' }}
      </button>
    </template>

    <template v-if="draftBetType === 'BetBuilder'">
      <div class="mini-heading">
        <h3>Combined odds</h3>
        <span class="mono-meta">AS SHOWN ON THE SLIP</span>
      </div>
      <div class="stake-card">
        <label class="builder-odds-field">
          <span class="builder-field-label">FRACTIONAL ODDS</span>
          <input v-model="draftCombinedOdds" placeholder="11/1" />
        </label>
      </div>
    </template>

    <p v-if="error" class="builder-error" role="alert">{{ error }}</p>

    <div class="builder-summary">
      <div class="builder-summary-row">
        <div>
          <span class="builder-field-label">COMBINED ODDS</span>
          <strong class="builder-summary-figure">{{ decimalToFractional(combinedOdds) }}</strong>
        </div>
        <div class="acca-return">
          <span class="builder-field-label">POTENTIAL RETURN</span>
          <strong class="builder-summary-figure lime">{{
            dashboard.money(potentialReturn)
          }}</strong>
        </div>
      </div>
      <button class="hero-button" type="button" :disabled="saving" @click="save(false)">
        <LoadingSpinner v-if="saving" label="Saving…" inline small />
        <template v-else>Save bet</template>
      </button>
      <button
        class="builder-add-leg"
        style="margin-top: 10px"
        type="button"
        :disabled="saving"
        @click="save(true)"
      >
        Save and start another bet
      </button>
    </div>
  </div>
</template>
