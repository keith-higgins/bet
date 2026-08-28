<script setup>
import { decimalToFractional } from '~/lib/odds'

defineProps({ legs: { type: Array, default: () => [] } })
</script>

<template>
  <div class="bet-slip">
    <div class="bet-slip-heading">
      <div>
        <p class="overline">BET SLIP</p>
        <h3>
          Accumulator <span>{{ legs.length }} legs</span>
        </h3>
      </div>
    </div>
    <div class="slip-legs">
      <div v-for="(leg, index) in legs" :key="index" class="slip-leg">
        <div class="slip-leg-number">{{ index + 1 }}</div>
        <div class="slip-leg-main">
          <strong>{{ leg.match || `Leg ${index + 1}` }}</strong
          ><small>{{ leg.market }} · {{ leg.pick || 'Pick not set' }}</small>
        </div>
        <strong class="slip-leg-odds">{{ decimalToFractional(leg.odds) }}</strong
        ><span class="slip-status" :class="leg.status">{{ leg.status }}</span>
      </div>
    </div>
  </div>
</template>
