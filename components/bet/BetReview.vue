<script setup>
import { decimalToFractional } from '~/lib/odds'

defineProps({
  legs: { type: Array, default: () => [] },
  stake: { type: Number, default: 0 },
  combinedOdds: { type: Number, default: 1 },
  potentialReturn: { type: Number, default: 0 },
  money: { type: Function, required: true }
})
</script>

<template>
  <div class="review-panel">
    <div v-for="(leg, index) in legs" :key="index" class="review-leg">
      <span>{{ index + 1 }}</span>
      <div>
        <strong>{{ leg.match }}</strong
        ><small>{{ leg.market }} · {{ leg.pick }}</small>
      </div>
      <b>{{ leg.odds }}</b>
    </div>
    <div class="return-preview">
      <span
        >Potential return<br /><small
          >{{ money(stake) }} stake · {{ decimalToFractional(combinedOdds) }} combined odds</small
        ></span
      ><strong>{{ money(potentialReturn) }}</strong>
    </div>
  </div>
</template>
