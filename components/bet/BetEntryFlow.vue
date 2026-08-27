<script setup>
import { decimalToFractional, fractionalToDecimal, isValidFractionalOdds } from '~/lib/odds'

const props = defineProps({
  open: Boolean,
  initialStake: { type: Number, default: 20 },
  initialLegs: { type: Array, default: () => [] },
  loading: Boolean,
  money: { type: Function, required: true }
})
const emit = defineEmits(['close', 'save'])
const step = ref(1)
const draftStake = ref(20)
const draftLegs = ref([])
const error = ref('')
const combinedOdds = computed(() =>
  draftLegs.value.reduce((total, leg) => total * (fractionalToDecimal(leg.odds) || 1), 1)
)
const potentialReturn = computed(() => Number(draftStake.value || 0) * combinedOdds.value)
const titles = ['Set your stake', 'Add your selections', 'Review your bet', 'Ready to play']

function reset() {
  draftStake.value = props.initialStake
  draftLegs.value = props.initialLegs.length
    ? props.initialLegs.map((leg) => ({ ...leg, odds: decimalToFractional(leg.odds) }))
    : [{ match: '', market: 'Match result', pick: '', odds: '1/2', status: 'pending' }]
  step.value = 1
  error.value = ''
}
watch(
  () => props.open,
  (value) => {
    if (value) reset()
  }
)

function addLeg() {
  draftLegs.value.push({
    match: '',
    market: 'Match result',
    pick: '',
    odds: '1/2',
    status: 'pending'
  })
}
function removeLeg(index) {
  draftLegs.value.splice(index, 1)
}
function next() {
  error.value = ''
  if (step.value === 1 && (!draftStake.value || Number(draftStake.value) < 1)) {
    error.value = 'Enter a stake of at least €1.'
    return
  }
  if (
    step.value === 2 &&
    draftLegs.value.some(
      (leg) => !leg.match.trim() || !leg.pick.trim() || !isValidFractionalOdds(leg.odds)
    )
  ) {
    error.value =
      'Complete every selection with a match, pick, and valid fractional odds, such as 1/2.'
    return
  }
  step.value = Math.min(4, step.value + 1)
}
function back() {
  error.value = ''
  step.value = Math.max(1, step.value - 1)
}
function save() {
  emit('save', {
    stake: Number(draftStake.value),
    legs: draftLegs.value.map((leg) => ({ ...leg, odds: fractionalToDecimal(leg.odds) }))
  })
}
</script>

<template>
  <div
    v-if="open"
    class="flow-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bet-flow-title"
  >
    <section class="flow-card">
      <header class="flow-header">
        <div>
          <p class="overline">STEP {{ step }} OF 4</p>
          <h2 id="bet-flow-title">{{ titles[step - 1] }}</h2>
        </div>
        <button
          class="modal-close"
          type="button"
          aria-label="Close bet flow"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>
      <div class="flow-progress"><span :style="{ width: `${step * 25}%` }" /></div>
      <div class="flow-body">
        <template v-if="step === 1"
          ><p class="flow-intro">Choose how much you want to stake on this week’s accumulator.</p>
          <label
            >Stake (€)<input
              v-model.number="draftStake"
              type="number"
              min="1"
              inputmode="decimal"
              placeholder="20"
              autofocus /></label
        ></template>
        <template v-else-if="step === 2"
          ><p class="flow-intro">
            Add one or more selections. You can edit them later from the round card.
          </p>
          <BetLegEditor v-model:legs="draftLegs" @add="addLeg" @remove="removeLeg"
        /></template>
        <template v-else-if="step === 3"
          ><p class="flow-intro">Check your selections before saving the bet.</p>
          <BetReview
            :legs="draftLegs"
            :stake="Number(draftStake)"
            :combined-odds="combinedOdds"
            :potential-return="potentialReturn"
            :money="money"
        /></template>
        <template v-else
          ><div class="confirmation-panel">
            <span class="confirmation-mark">✓</span>
            <h3>Your bet is ready</h3>
            <p>
              {{ draftLegs.length }} selections · {{ money(draftStake) }} stake ·
              {{ money(potentialReturn) }} potential return
            </p>
          </div></template
        >
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </div>
      <footer class="flow-footer">
        <button v-if="step > 1" class="text-button back-button" type="button" @click="back">
          ← Back</button
        ><span v-else /><button v-if="step < 4" class="primary-button" type="button" @click="next">
          Continue →</button
        ><button v-else class="primary-button" type="button" :disabled="loading" @click="save">
          {{ loading ? 'Saving…' : 'Save bet →' }}
        </button>
      </footer>
    </section>
  </div>
</template>
