<script setup>
const dashboard = reactive(useDashboard())

// Every bet placed this round gets its own card (not just the viewer's own —
// this mirrors the round-wide match centre on Home, so a friend's bet still
// shows up here instead of only appearing for them): one ACCA status bar for
// the whole bet (it's one bet, however many legs), with the per-leg breakdown
// living in the match rows nested inside that same card — not a pip per leg up top.
const betCards = computed(() =>
  dashboard.round.bets
    .map((currentBet) => {
      const legs = (currentBet.selections || []).filter((leg) => leg.matchId)
      if (!legs.length) return null

      const grouped = new Map()
      legs.forEach((leg) => {
        const pick = { market: leg.market, pick: leg.pick, status: leg.status }
        const existing = grouped.get(leg.matchId)
        if (existing) existing.picks.push(pick)
        else grouped.set(leg.matchId, { ...leg, picks: [pick] })
      })

      const landedCount = legs.filter((leg) => leg.status === 'won').length
      const lostCount = legs.filter((leg) => leg.status === 'lost').length
      const toGoCount = legs.length - landedCount - lostCount
      const legPips = legs.map((leg) =>
        leg.status === 'won' ? 'won' : leg.status === 'lost' ? 'lost' : 'pending'
      )

      return {
        id: currentBet.id,
        bettor: currentBet.bettor,
        landedCount,
        toGoCount,
        legPips,
        matches: [...grouped.values()]
      }
    })
    .filter(Boolean)
)
</script>

<template>
  <div class="screen-pad">
    <div class="screen-header">
      <p class="screen-overline">MATCH CENTRE &middot; REFRESHES EVERY 2 MINS</p>
      <h2 class="screen-title">Live scores</h2>
    </div>

    <div v-for="card in betCards" :key="card.id" class="bet-live-group">
      <div class="acca-status-card">
        <div>
          <p class="builder-field-label" style="margin-bottom: 7px">
            {{ card.bettor ? `${card.bettor}'S ACCA STATUS` : 'ACCA STATUS' }}
          </p>
          <strong>{{ card.landedCount }} landed &middot; {{ card.toGoCount }} to go</strong>
        </div>
        <div class="acca-status-pips">
          <span v-for="(pip, index) in card.legPips" :key="index" :class="pip" />
        </div>
      </div>

      <LiveScoresCard :matches="card.matches" detailed />
    </div>

    <div
      v-if="!betCards.length"
      class="acca-empty"
      style="border: 1px solid var(--line); border-radius: 18px"
    >
      <span>No matches to track yet. Add selections to your acca first.</span>
    </div>
  </div>
</template>

<style scoped>
.bet-live-group {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
</style>
