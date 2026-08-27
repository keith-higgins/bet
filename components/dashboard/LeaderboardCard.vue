<script setup>
defineProps({
  leaders: { type: Array, default: () => [] },
  money: { type: Function, required: true }
})
</script>

<template>
  <section>
    <div class="section-heading">
      <div>
        <p class="overline">THE SCOREBOARD</p>
        <h2>League leaders</h2>
      </div>
    </div>
    <article class="leaderboard">
      <div v-for="(leader, index) in leaders" :key="leader.userId" class="leader-row">
        <div class="leader-person">
          <span class="rank">{{ index + 1 }}</span>
          <div class="avatar" :class="index === 0 ? 'purple' : 'yellow'">{{ leader.initials }}</div>
          <strong>{{ leader.name }}</strong>
        </div>
        <strong>{{ leader.record }}</strong
        ><span class="profit" :class="{ loss: leader.profit < 0 }">{{ money(leader.profit) }}</span>
      </div>
      <div v-if="!leaders.length" class="empty-state">
        <strong>No players yet</strong><span>Invite someone to start the scoreboard.</span>
      </div>
    </article>
  </section>
</template>
