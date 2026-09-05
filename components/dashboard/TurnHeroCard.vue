<script setup>
const props = defineProps({
  round: { type: Object, required: true },
  bet: { type: Object, required: true },
  canEdit: Boolean,
  isAdmin: Boolean,
  databaseEnabled: { type: Boolean, default: true },
  money: { type: Function, required: true }
})

defineEmits(['edit'])

// Local preview mode (no Supabase configured) has no way to create a real
// round, so its in-memory placeholder round always stands in for one.
const hasRound = computed(() => Boolean(props.round.id) || !props.databaseEnabled)
const isSettled = computed(() => props.round.status === 'settled')
const betWon = computed(() => props.bet.status === 'won')
const betLost = computed(() => props.bet.status === 'lost')

const countdown = computed(() => {
  if (!props.round.deadline) return null
  const diff = new Date(props.round.deadline).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  return `${days}d ${String(hours).padStart(2, '0')}h LEFT`
})
</script>

<template>
  <section
    class="hero-card"
    :class="{ 'tone-won': isSettled && betWon, 'tone-lost': isSettled && betLost }"
  >
    <template v-if="!hasRound">
      <div class="hero-top">
        <span class="hero-overline">NO WEEK YET</span>
      </div>
      <h2 class="hero-headline">Nothing on the board</h2>
      <p class="hero-empty-copy">
        {{
          isAdmin
            ? 'Start this week from Manage to open it up for bets.'
            : 'Ask an admin to start this week&rsquo;s round.'
        }}
      </p>
      <NuxtLink v-if="isAdmin" class="hero-button" to="/admin">Go to Manage &rarr;</NuxtLink>
    </template>
    <template v-else>
      <div class="hero-top">
        <span class="hero-overline">{{ round.title }}</span>
        <span v-if="isSettled" class="hero-countdown">{{
          betWon ? 'WON' : betLost ? 'LOST' : 'SETTLED'
        }}</span>
        <span v-else-if="countdown" class="hero-countdown">{{ countdown }}</span>
      </div>
      <h2 class="hero-headline">
        {{ isSettled ? `Last week's acca` : "You're on the hook" }}
      </h2>
      <div class="hero-stats">
        <div>
          <span class="hero-stat-label">STAKE / BET</span>
          <strong>{{ money(round.stake) }}</strong>
        </div>
        <div class="hero-divider" />
        <div v-if="isSettled">
          <span class="hero-stat-label">RETURN</span>
          <strong>{{ money(bet.actualReturn) }}</strong>
        </div>
        <div v-else>
          <span class="hero-stat-label">DEADLINE</span>
          <strong>{{ round.dates }}</strong>
        </div>
      </div>
      <button v-if="canEdit && !isSettled" class="hero-button" type="button" @click="$emit('edit')">
        Place a bet &rarr;
      </button>
      <NuxtLink v-else-if="isSettled && isAdmin" class="hero-button" to="/admin"
        >Go to Manage &rarr;</NuxtLink
      >
    </template>
  </section>
</template>
