<script setup>
const props = defineProps({
  rounds: { type: Array, default: () => [] },
  currentRound: { type: Object, required: true },
  currentBet: { type: Object, required: true },
  settled: Boolean,
  money: { type: Function, required: true }
})
const history = computed(() => [
  ...(props.settled ? [{ ...props.currentRound, bets: [props.currentBet] }] : []),
  ...props.rounds
])
</script>

<template>
  <section class="recent-weeks">
    <div class="section-heading">
      <div>
        <p class="overline">RECENT ACTIVITY</p>
        <h2>Past weeks</h2>
      </div>
    </div>
    <HistoryList :rounds="history" :money="money" />
  </section>
</template>
