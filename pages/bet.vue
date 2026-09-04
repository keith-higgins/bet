<script setup>
import { decimalToFractional, fractionalToDecimal, isValidFractionalOdds } from '~/lib/odds'

const dashboard = reactive(useDashboard())

onMounted(() => {
  if (!dashboard.canManageCurrentBet) navigateTo('/')
})

const draftStake = ref(dashboard.stake || 20)
const draftLegs = ref([])
const openLeg = ref(0)
const error = ref('')
const saving = ref(false)
const entryMode = ref(dashboard.legs.length ? 'manual' : 'upload')

function blankLeg() {
  return { match: '', market: '', pick: '', odds: '', status: 'pending' }
}

watchEffect(() => {
  if (draftLegs.value.length) return
  draftStake.value = dashboard.stake || 20
  draftLegs.value = dashboard.legs.length
    ? dashboard.legs.map((leg) => ({ ...leg, odds: decimalToFractional(leg.odds) }))
    : [blankLeg()]
})

function applyParsedSlip(result) {
  if (result.stake) draftStake.value = result.stake
  draftLegs.value = result.legs.map((leg) => ({
    match: leg.match,
    market: leg.market,
    pick: leg.pick,
    odds: leg.odds,
    status: 'pending'
  }))
  openLeg.value = -1
  entryMode.value = 'manual'
}

const combinedOdds = computed(() =>
  draftLegs.value.reduce((total, leg) => total * (fractionalToDecimal(leg.odds) || 1), 1)
)
const potentialReturn = computed(() => Number(draftStake.value || 0) * combinedOdds.value)

const stakeChips = [10, 20, 50]

function adjustStake(delta) {
  draftStake.value = Math.max(1, Number(draftStake.value || 0) + delta)
}

function updateLeg(index, value) {
  draftLegs.value = draftLegs.value.map((leg, i) => (i === index ? value : leg))
}

function addLeg() {
  draftLegs.value = [...draftLegs.value, blankLeg()]
  openLeg.value = draftLegs.value.length - 1
}

function removeLeg(index) {
  draftLegs.value = draftLegs.value.filter((_, i) => i !== index)
  openLeg.value = -1
}

function toggleLeg(index) {
  openLeg.value = openLeg.value === index ? -1 : index
}

async function save() {
  error.value = ''
  if (!draftStake.value || Number(draftStake.value) < 1) {
    error.value = 'Enter a stake of at least €1.'
    return
  }
  if (
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
    legs: draftLegs.value.map((leg) => ({ ...leg, odds: fractionalToDecimal(leg.odds) }))
  })
  saving.value = false
  if (saved) navigateTo('/')
}
</script>

<template>
  <div class="builder-page">
    <div class="builder-header">
      <div>
        <p class="screen-overline" style="margin-bottom: 9px">
          WEEK {{ dashboard.round.week }} &middot; ONE ACCA PER ROUND
        </p>
        <h2 class="builder-title">Build your acca</h2>
      </div>
      <button class="builder-close" type="button" aria-label="Close" @click="navigateTo('/')">
        &times;
      </button>
    </div>

    <div class="stake-card">
      <p class="builder-field-label">STAKE</p>
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
    <BetSlipUpload v-if="entryMode === 'upload'" @parsed="applyParsedSlip" />
    <template v-else>
      <div class="builder-legs">
        <BetBuilderLeg
          v-for="(leg, index) in draftLegs"
          :key="index"
          :leg="leg"
          :index="index"
          :open="openLeg === index"
          :can-remove="draftLegs.length > 1"
          @toggle="toggleLeg(index)"
          @update="updateLeg(index, $event)"
          @remove="removeLeg(index)"
        />
      </div>
      <button type="button" class="builder-add-leg" @click="addLeg">&#65291; Add another leg</button>
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
      <button class="hero-button" type="button" :disabled="saving" @click="save">
        <LoadingSpinner v-if="saving" label="Saving…" inline small />
        <template v-else>Save bet</template>
      </button>
    </div>
  </div>
</template>
