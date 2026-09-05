<script setup>
import { decimalToFractional } from '~/lib/odds'

const props = defineProps({
  bets: { type: Array, default: () => [] },
  currentUserId: { type: String, default: '' },
  isSettled: Boolean,
  money: { type: Function, required: true }
})
const emit = defineEmits(['edit', 'new-bet'])

function initialsOf(name) {
  return (name || 'P')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const cards = computed(() =>
  props.bets.map((bet, index) => {
    const isOwn = !props.currentUserId || bet.bettorId === props.currentUserId
    const legCount = bet.selections.length
    const combinedOdds = bet.selections.reduce(
      (total, leg) => total * (Number(leg.odds) || 1),
      1
    )
    const isWon = bet.status === 'won'
    const isLost = bet.status === 'lost'
    const returnValue = isWon
      ? Number(bet.actualReturn || 0)
      : isLost
        ? 0
        : Number(bet.stake || 0) * combinedOdds
    return {
      id: bet.id,
      isOwn,
      owner: bet.bettor || 'Player',
      initials: initialsOf(bet.bettor),
      n: index + 1,
      legCount,
      stake: Number(bet.stake || 0),
      combinedOdds,
      returnValue,
      returnLabel: isWon ? 'RETURNED' : 'RETURNS',
      statusLabel: isWon ? 'WON' : isLost ? 'BUST' : legCount ? 'LIVE' : 'NEW',
      statusClass: isWon ? 'won' : isLost ? 'lost' : 'pending',
      legs: bet.selections
    }
  })
)
const totalStaked = computed(() =>
  props.bets.reduce((total, bet) => total + Number(bet.stake || 0), 0)
)
const stillRiding = computed(() =>
  cards.value
    .filter((card) => card.statusClass !== 'lost' && card.legCount)
    .reduce((total, card) => total + card.returnValue, 0)
)
</script>

<template>
  <section>
    <div class="mini-heading">
      <h3>{{ isSettled ? "Last week's bets" : "This week's bets" }}</h3>
      <span class="mono-meta"
        >{{ bets.length }} BET{{ bets.length === 1 ? '' : 'S' }} &middot;
        {{ money(totalStaked) }} STAKED</span
      >
    </div>
    <div class="bet-carousel">
      <div v-for="card in cards" :key="card.id" class="bet-carousel-card" :class="{ own: card.isOwn }">
        <div class="bet-carousel-header">
          <div class="avatar" :class="{ purple: card.isOwn }">{{ card.initials }}</div>
          <div class="bet-carousel-owner">
            <strong>{{ card.owner }}</strong>
            <small
              >BET {{ card.n }} &middot; {{ card.legCount }} LEG{{ card.legCount === 1 ? '' : 'S' }}
              &middot; {{ money(card.stake) }}</small
            >
          </div>
          <span class="status-pill" :class="card.statusClass">{{ card.statusLabel }}</span>
        </div>
        <div class="bet-carousel-figures">
          <div>
            <span class="acca-footer-label">ODDS</span>
            <strong>{{ card.legCount ? decimalToFractional(card.combinedOdds) : '—' }}</strong>
          </div>
          <div class="acca-return">
            <span class="acca-footer-label">{{ card.returnLabel }}</span>
            <strong>{{ card.legCount ? money(card.returnValue) : '—' }}</strong>
          </div>
        </div>
        <div v-if="card.legCount" class="bet-carousel-pips">
          <span v-for="(leg, index) in card.legs" :key="index" :class="leg.status" />
        </div>
        <button
          v-if="card.isOwn"
          type="button"
          class="hero-button bet-carousel-action"
          @click="emit('edit', card.id)"
        >
          {{ card.legCount ? 'Edit bet' : 'Add a selection' }}
        </button>
        <span v-else class="bet-carousel-view">View only</span>
      </div>
      <button
        v-if="!isSettled"
        type="button"
        class="bet-carousel-new"
        @click="emit('new-bet')"
      >
        &#65291; New bet
      </button>
    </div>
    <p v-if="stillRiding > 0" class="bet-carousel-note">
      Swipe for the rest &mdash; {{ money(stillRiding) }}
      {{ isSettled ? 'from last week.' : 'riding on this week.' }}
    </p>
  </section>
</template>
