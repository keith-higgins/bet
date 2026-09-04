<script setup>
const dashboard = reactive(useDashboard())
const settlementOpen = ref(false)

// AppShell only loads the dashboard once, on initial app boot — landing back
// here after saving a bet (a soft client-side navigation) doesn't re-trigger
// that, so refresh explicitly to pick up whatever was just saved.
onMounted(dashboard.loadDashboard)

async function saveSettlement(statuses) {
  const saved = await dashboard.settleBet(statuses)
  if (saved) settlementOpen.value = false
}
</script>

<template>
  <div class="screen-pad">
    <LoadingSpinner v-if="dashboard.loading && !dashboard.round.id" label="Loading dashboard…" />
    <template v-else>
      <div v-if="!dashboard.databaseEnabled" class="local-mode-banner">
        <span>Local preview mode</span
        ><small>Connect Supabase to sync the league across devices.</small>
      </div>

      <TurnHeroCard
        :round="dashboard.round"
        :bet="dashboard.bet"
        :can-edit="dashboard.canManageCurrentBet"
        :is-admin="dashboard.isAdmin"
        :database-enabled="dashboard.databaseEnabled"
        :money="dashboard.money"
        @edit="navigateTo('/bet')"
      />

      <RecordCard
        :personal-record="dashboard.personalRecord"
        :personal-profit-loss="dashboard.personalProfitLoss"
        :personal-best-return="dashboard.personalBestReturn"
        :personal-staked="dashboard.personalStaked"
        :personal-form="dashboard.personalForm"
        :table-position="dashboard.personalTablePosition"
        :money="dashboard.money"
      />

      <AccumulatorCard
        :bet="dashboard.bet"
        :legs="dashboard.legs"
        :combined-odds="dashboard.combinedOdds"
        :potential-return="dashboard.potentialReturn"
        :can-edit="dashboard.canManageCurrentBet"
        :current-user-id="dashboard.currentUserId"
        :money="dashboard.money"
        @edit="navigateTo('/bet')"
      />
      <button
        v-if="dashboard.canManageCurrentBet && dashboard.bet.selections.length"
        class="link-button settle-link"
        type="button"
        @click="settlementOpen = true"
      >
        {{ dashboard.settled ? 'Override settlement' : 'Settle this bet' }} &rarr;
      </button>

      <section v-if="dashboard.trackedMatches.length">
        <div class="mini-heading">
          <h3>Match centre</h3>
          <button class="link-button" type="button" @click="navigateTo('/live')">
            All matches &rarr;
          </button>
        </div>
        <LiveScoresCard :matches="dashboard.trackedMatches" :limit="2" />
      </section>

      <section>
        <div class="mini-heading">
          <h3>League</h3>
          <button class="link-button" type="button" @click="navigateTo('/league')">
            Full table &rarr;
          </button>
        </div>
        <LeaderboardCard :leaders="dashboard.leaders" :limit="3" :money="dashboard.money" />
      </section>
    </template>

    <SettlementFlow
      :open="settlementOpen"
      :legs="dashboard.legs"
      :loading="dashboard.loading"
      @close="settlementOpen = false"
      @save="saveSettlement"
    />
    <ToastMessage :message="dashboard.toast" />
  </div>
</template>
