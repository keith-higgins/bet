<script setup>
const dashboard = reactive(useDashboard())
const betFlowOpen = ref(false)
const settlementOpen = ref(false)
const newRoundOpen = ref(false)

onMounted(dashboard.loadDashboard)

async function saveBet(payload) {
  const saved = await dashboard.saveBet(payload)
  if (saved) betFlowOpen.value = false
}

async function saveSettlement(statuses) {
  const saved = await dashboard.settleBet(statuses)
  if (saved) settlementOpen.value = false
}

async function saveNewRound(details) {
  const created = await dashboard.addNewWeek(details)
  if (created) newRoundOpen.value = false
}
</script>

<template>
  <div>
    <div class="page-wrap">
      <DashboardHeader
        :has-bet="dashboard.bet.selections.length > 0"
        :can-edit="dashboard.canManageCurrentBet"
        :display-name="dashboard.currentUserName"
        :round="dashboard.round"
        @add-bet="betFlowOpen = true"
        @new-round="newRoundOpen = true"
      />
      <StatsSummary
        :total-profit-loss="dashboard.totalProfitLoss"
        :best-week-profit="dashboard.bestWeekProfit"
        :current-bettor="dashboard.currentBettorName"
        :money="dashboard.money"
      />
      <LiveScoresCard :matches="dashboard.trackedMatches" />
      <div v-if="!dashboard.databaseEnabled" class="local-mode-banner">
        <span>Local preview mode</span
        ><small>Connect Supabase to sync the league across devices.</small>
      </div>
      <section class="content-grid">
        <div class="left-column">
          <CurrentRoundCard
            :round="dashboard.round"
            :bet="dashboard.bet"
            :legs="dashboard.legs"
            :settled="dashboard.settled"
            :money="dashboard.money"
            @edit="betFlowOpen = true"
            @settle="settlementOpen = true"
          />
          <RecentWeeks
            :rounds="dashboard.previousRounds"
            :current-round="dashboard.round"
            :current-bet="dashboard.bet"
            :settled="dashboard.settled"
            :money="dashboard.money"
          />
        </div>
        <div class="right-column">
          <LeaderboardCard :leaders="dashboard.leaders" :money="dashboard.money" />
        </div>
      </section>
    </div>

    <BetEntryFlow
      :open="betFlowOpen"
      :initial-stake="dashboard.stake"
      :initial-legs="dashboard.legs"
      :loading="dashboard.loading"
      :money="dashboard.money"
      @close="betFlowOpen = false"
      @save="saveBet"
    />
    <SettlementFlow
      :open="settlementOpen"
      :legs="dashboard.legs"
      :loading="dashboard.loading"
      @close="settlementOpen = false"
      @save="saveSettlement"
    />
    <NewRoundFlow
      :open="newRoundOpen"
      :loading="dashboard.loading"
      :members="dashboard.players"
      :users="dashboard.assignableUsers"
      :default-bettor-id="dashboard.nextBettorId"
      @close="newRoundOpen = false"
      @save="saveNewRound"
    />
    <ToastMessage :message="dashboard.toast" />
  </div>
</template>
