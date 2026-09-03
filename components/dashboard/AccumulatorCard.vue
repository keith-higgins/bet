<script setup>
import { decimalToFractional } from '~/lib/odds'

const props = defineProps({
  bet: { type: Object, required: true },
  legs: { type: Array, default: () => [] },
  combinedOdds: { type: Number, default: 1 },
  potentialReturn: { type: Number, default: 0 },
  canEdit: Boolean,
  money: { type: Function, required: true }
})
defineEmits(['edit'])

const hasLegs = computed(() => props.bet.selections.length > 0)
</script>

<template>
  <section>
    <div class="mini-heading">
      <h3>Your accumulator</h3>
      <span class="mono-meta"
        >{{ bet.selections.length }} LEG{{ bet.selections.length === 1 ? '' : 'S' }}</span
      >
    </div>
    <div class="acca-card">
      <template v-if="hasLegs">
        <div v-for="(leg, index) in legs" :key="index" class="acca-leg-row">
          <span class="acca-leg-dot" :class="leg.status" />
          <div class="acca-leg-main">
            <strong>{{ leg.match || 'Unlinked match' }}</strong>
            <small>{{ leg.market }} &middot; {{ leg.pick }}</small>
          </div>
          <span class="acca-leg-odds">{{ decimalToFractional(leg.odds) }}</span>
        </div>
        <div class="acca-footer">
          <div>
            <span class="acca-footer-label">COMBINED ODDS</span>
            <strong>{{ decimalToFractional(combinedOdds) }}</strong>
          </div>
          <div class="acca-return">
            <span class="acca-footer-label">POTENTIAL RETURN</span>
            <strong>{{ money(potentialReturn) }}</strong>
          </div>
        </div>
      </template>
      <div v-else class="acca-empty">
        <span>No selections yet this week.</span>
        <button v-if="canEdit" class="link-button" type="button" @click="$emit('edit')">
          Build the acca &rarr;
        </button>
      </div>
    </div>
  </section>
</template>
