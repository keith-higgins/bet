<script setup>
const props = defineProps({
  personalRecord: { type: Object, required: true },
  personalProfitLoss: { type: Number, default: 0 },
  personalBestReturn: { type: Number, default: 0 },
  personalStaked: { type: Number, default: 0 },
  personalForm: { type: Array, default: () => [] },
  tablePosition: { type: Object, required: true },
  money: { type: Function, required: true }
})

const settledCount = computed(() => props.personalRecord.won + props.personalRecord.lost)
const signedProfit = computed(
  () => (props.personalProfitLoss >= 0 ? '+' : '') + props.money(props.personalProfitLoss)
)
</script>

<template>
  <article class="record-card">
    <span class="record-card-overline">YOUR RECORD &middot; {{ settledCount }} SETTLED</span>
    <div class="record-row">
      <div class="record-figure">
        <strong>{{ personalRecord.won }}&ndash;{{ personalRecord.lost }}</strong>
        <span class="record-key">WON<br />LOST</span>
      </div>
      <div class="record-net" :class="{ negative: personalProfitLoss < 0 }">
        <span class="record-net-label">NET PROFIT</span>
        <strong>{{ signedProfit }}</strong>
      </div>
    </div>
    <div class="form-bars">
      <span v-for="(result, index) in personalForm" :key="index" :class="result" />
    </div>
    <div class="record-footer">
      <div>
        <span class="record-footer-label">BEST WEEK</span>
        <strong>{{ money(personalBestReturn) }}</strong>
      </div>
      <div>
        <span class="record-footer-label">STAKED</span>
        <strong>{{ money(personalStaked) }}</strong>
      </div>
      <div>
        <span class="record-footer-label">TABLE</span>
        <strong
          >{{ tablePosition.rank
          }}{{
            tablePosition.rank === 1
              ? 'st'
              : tablePosition.rank === 2
                ? 'nd'
                : tablePosition.rank === 3
                  ? 'rd'
                  : 'th'
          }}
          of {{ tablePosition.total }}</strong
        >
      </div>
    </div>
  </article>
</template>
