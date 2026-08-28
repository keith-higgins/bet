<script setup>
const props = defineProps({
  round: { type: Object, required: true },
  bet: { type: Object, required: true },
  legs: { type: Array, default: () => [] },
  canEdit: Boolean,
  settled: Boolean,
  money: { type: Function, required: true }
})
defineEmits(['edit', 'settle'])
const showSlip = ref(false)
const roundSettled = computed(() => props.round.status === 'settled' || props.settled)
const potentialReturn = computed(() => {
  if (!props.bet.selections?.length) return null
  const combinedOdds = props.legs.reduce((total, leg) => total * (Number(leg.odds) || 1), 1)
  return Number(props.bet.stake || props.round.stake) * combinedOdds
})
function initials(name) {
  return (name || 'Player')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
</script>

<template>
  <section>
    <div class="section-heading">
      <div>
        <p class="overline">THE CURRENT ROUND</p>
        <h2>
          Week {{ round.week }}
          <span class="badge">{{
            roundSettled ? 'Settled' : round.id ? 'In progress' : 'Not started'
          }}</span>
        </h2>
      </div>
      <button v-if="canEdit" class="text-button" type="button" @click="$emit('edit')">
        Edit bet →
      </button>
    </div>
    <article class="challenge-card">
      <div class="challenge-head">
        <div>
          <span class="week-kicker">Deadline {{ round.dates }}</span>
          <h3>{{ round.title }}</h3>
        </div>
        <div class="round-values">
          <div class="stake-pill">
            <span>Stake</span><strong>{{ money(bet.stake || round.stake) }}</strong>
          </div>
          <div v-if="potentialReturn !== null" class="stake-pill potential-return-pill">
            <span>Potential return</span><strong>{{ money(potentialReturn) }}</strong>
          </div>
        </div>
      </div>
      <div class="player-bets">
        <div class="player-bet">
          <div class="person-line">
            <div class="avatar" :class="canEdit ? 'purple' : 'yellow'">
              {{ canEdit ? 'ME' : initials(bet.bettor || round.bettor) }}
            </div>
            <div>
              <strong>{{
                canEdit ? 'Your bet' : `${bet.bettor || round.bettor || 'Player'}'s bet`
              }}</strong
              ><small>{{
                bet.selections.length
                  ? `${bet.type} · ${bet.selections.length} selections`
                  : 'Not placed yet'
              }}</small>
            </div>
            <span class="bet-state" :class="bet.selections.length ? bet.status : 'waiting'">{{
              bet.selections.length ? bet.status : 'Waiting'
            }}</span>
          </div>
          <div v-if="bet.selections.length" class="bet-actions">
            <button class="bet-link" type="button" @click="showSlip = !showSlip">
              {{ showSlip ? 'Hide slip ↑' : 'View slip ↗' }}
            </button>
            <button v-if="canEdit" class="bet-link" type="button" @click="$emit('settle')">
              {{ roundSettled ? 'Override settlement ↗' : 'Settle bet ↗' }}
            </button>
          </div>
          <button
            v-else-if="canEdit"
            class="outline-button empty-bet-action"
            type="button"
            @click="$emit('edit')"
          >
            Add your selections
          </button>
          <BetSlip v-if="showSlip && bet.selections.length" :legs="legs" />
        </div>
      </div>
      <div class="challenge-foot">
        <span>One accumulator per round</span
        ><span>{{ roundSettled ? 'Round settled' : 'Round in progress' }}</span>
      </div>
    </article>
  </section>
</template>
