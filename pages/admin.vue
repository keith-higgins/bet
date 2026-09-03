<script setup>
const dashboard = reactive(useDashboard())
const usersVersion = ref(0)
const addPlayerOpen = ref(false)
const diagnosticsOpen = ref(false)

const newWeekTitle = ref('')
const newWeekStake = ref(20)
const newWeekBettorId = ref('')
const creating = ref(false)

watchEffect(() => {
  if (!newWeekBettorId.value) newWeekBettorId.value = dashboard.nextBettorId
})

async function createWeek() {
  creating.value = true
  const created = await dashboard.addNewWeek({
    title: newWeekTitle.value.trim(),
    stake: newWeekStake.value,
    bettorId: newWeekBettorId.value
  })
  if (created) newWeekTitle.value = ''
  creating.value = false
}

async function playerCreated() {
  usersVersion.value += 1
  addPlayerOpen.value = false
  // A new player affects the shared dashboard state too (assignable users,
  // the bettor picker above, League) — refresh it so it shows up right away.
  await dashboard.loadDashboard()
}
</script>

<template>
  <div class="screen-pad">
    <div class="builder-header" style="margin-bottom: 0">
      <div class="screen-header">
        <p class="screen-overline">LEAGUE MANAGEMENT</p>
        <h2 class="screen-title">Manage</h2>
      </div>
      <NuxtLink class="builder-close" to="/account" aria-label="Back to account">&times;</NuxtLink>
    </div>

    <div class="manage-card">
      <p class="builder-field-label">START NEXT WEEK</p>
      <label class="manage-field">
        <span>Title</span>
        <input
          v-model="newWeekTitle"
          type="text"
          maxlength="80"
          :placeholder="`Premier League week ${dashboard.round.week + 1}`"
        />
      </label>
      <div class="manage-week-fields">
        <label class="manage-field">
          <span>Stake (&euro;)</span>
          <input v-model.number="newWeekStake" type="number" min="1" />
        </label>
        <label class="manage-field">
          <span>Bettor</span>
          <select v-model="newWeekBettorId">
            <option
              v-for="user in dashboard.assignableUsers"
              :key="user.userId"
              :value="user.userId"
            >
              {{ user.displayName }}
            </option>
          </select>
        </label>
      </div>
      <button
        class="hero-button manage-lime-button"
        type="button"
        :disabled="creating"
        @click="createWeek"
      >
        <LoadingSpinner v-if="creating" label="Creating…" inline small />
        <template v-else>Create week</template>
      </button>
    </div>

    <div class="mini-heading">
      <h3>Players</h3>
      <span class="mono-meta">{{ dashboard.players.length }} ACCOUNTS</span>
    </div>
    <AdminUserList :key="usersVersion" />

    <button
      v-if="!addPlayerOpen"
      type="button"
      class="builder-add-leg"
      @click="addPlayerOpen = true"
    >
      &#65291; Add a player
    </button>
    <PlayerInviteForm v-else @created="playerCreated" />

    <NuxtLink class="link-button" to="/challenges">Advanced week tools &rarr;</NuxtLink>

    <button
      type="button"
      class="link-button"
      style="justify-self: start"
      @click="diagnosticsOpen = !diagnosticsOpen"
    >
      {{ diagnosticsOpen ? 'Hide diagnostics' : 'Diagnostics' }}
    </button>
    <AdminPaddyPowerTester v-if="diagnosticsOpen" />
  </div>
</template>
