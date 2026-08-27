<script setup>
const props = defineProps({
  round: { type: Object, required: true },
  bet: { type: Object, required: true },
  legs: { type: Array, default: () => [] },
  settled: Boolean,
  money: { type: Function, required: true }
})
defineEmits(['edit', 'settle'])
const showSlip = ref(false)
const roundSettled = computed(() => props.round.status === 'settled' || props.settled)
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
      <button class="text-button" type="button" @click="$emit('edit')">Edit bet →</button>
    </div>
    <article class="challenge-card">
      <div class="challenge-head">
        <div>
          <span class="week-kicker">Deadline {{ round.dates }}</span>
          <h3>{{ round.title }}</h3>
        </div>
        <div class="stake-pill">
          <span>Stake</span><strong>{{ money(bet.stake || round.stake) }}</strong>
        </div>
      </div>
      <div class="round-deadline">
        <span class="deadline-dot" />Submit your bet before the deadline
      </div>
      <div class="player-bets">
        <div class="player-bet">
          <div class="person-line">
            <div class="avatar purple">ME</div>
            <div>
              <strong>Your bet</strong
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
          <button
            v-if="bet.selections.length"
            class="bet-link"
            type="button"
            @click="showSlip = !showSlip"
          >
            {{ showSlip ? 'Hide slip ↑' : 'View slip ↗' }}</button
          ><button
            v-else
            class="outline-button empty-bet-action"
            type="button"
            @click="$emit('edit')"
          >
            Add your selections
          </button>
        </div>
      </div>
      <BetSlip
        v-if="showSlip && bet.selections.length"
        :legs="legs"
        :settled="roundSettled"
        @settle="$emit('settle')"
      />
      <div class="challenge-foot">
        <span>One accumulator per round</span
        ><span>{{ roundSettled ? 'Round settled' : 'Round in progress' }}</span>
      </div>
    </article>
  </section>
</template>
