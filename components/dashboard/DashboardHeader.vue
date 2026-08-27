<script setup>
defineProps({
  hasBet: Boolean,
  displayName: { type: String, default: 'there' },
  round: { type: Object, required: true }
})
defineEmits(['add-bet', 'new-round'])
</script>

<template>
  <section class="dashboard-header">
    <div>
      <p class="overline">YOUR FOOTBALL CHALLENGE</p>
      <h1>Welcome back, {{ displayName }} <span aria-hidden="true">✦</span></h1>
      <p class="subheading">One bettor, one bet, every week.</p>
    </div>
    <div class="header-actions">
      <button class="outline-button" type="button" @click="$emit('new-round')">＋ New round</button
      ><button class="primary-button" type="button" @click="$emit('add-bet')">
        ＋ {{ hasBet ? 'Edit bet' : 'Add this week’s bet' }}
      </button>
    </div>
  </section>
</template>
