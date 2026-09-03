<script setup>
const dashboard = reactive(useDashboard())
const { playerCount } = useAppMeta()

const maxAbs = computed(() =>
  Math.max(1, ...dashboard.leaders.map((leader) => Math.abs(leader.profit)))
)
const leader = computed(() => dashboard.leaders[0])

watchEffect(() => {
  playerCount.value = dashboard.leaders.length
})

function barWidth(profit) {
  return Math.round((Math.abs(profit) / maxAbs.value) * 100) + '%'
}
</script>

<template>
  <div class="screen-pad">
    <div class="screen-header">
      <p class="screen-overline">THE SCOREBOARD &middot; SINCE AUGUST</p>
      <h2 class="screen-title">League table</h2>
    </div>

    <div v-if="leader" class="league-leader-card">
      <p class="builder-field-label">CURRENT LEADER</p>
      <div class="league-leader-row">
        <div class="avatar league-leader-avatar purple">{{ leader.initials }}</div>
        <div class="league-leader-main">
          <strong>{{ leader.name }}</strong>
          <span class="mono-meta">{{ leader.record }}</span>
        </div>
        <span class="league-leader-profit">{{ dashboard.money(leader.profit) }}</span>
      </div>
    </div>

    <div class="league-rows">
      <div
        v-for="(person, index) in dashboard.leaders"
        :key="person.userId"
        class="league-row-card"
        :class="{ 'is-you': person.userId === dashboard.currentUserId }"
      >
        <div class="league-row-top">
          <span class="league-preview-rank">{{ index + 1 }}</span>
          <div class="avatar" :class="index === 0 ? 'purple' : 'yellow'">{{ person.initials }}</div>
          <div class="league-row-main">
            <strong>{{ person.name }}</strong>
            <span class="mono-meta"
              >{{ person.record }}
              <template v-if="person.userId === dashboard.currentUserId"
                >&middot; You</template
              ></span
            >
          </div>
          <span class="league-preview-profit" :class="{ negative: person.profit < 0 }">{{
            dashboard.money(person.profit)
          }}</span>
        </div>
        <div class="league-row-track">
          <span
            class="league-row-fill"
            :class="{ negative: person.profit < 0 }"
            :style="{ width: barWidth(person.profit) }"
          />
        </div>
      </div>
      <div v-if="!dashboard.leaders.length" class="acca-empty">
        <span>No players yet. Invite someone to start the scoreboard.</span>
      </div>
    </div>

    <p class="league-footnote">Profit is returns minus stakes on settled bets.</p>
  </div>
</template>
