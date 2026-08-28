<script setup>
const props = defineProps({
  item: { type: Object, required: true },
  money: { type: Function, required: true },
  users: { type: Array, default: () => [] }
})
const emit = defineEmits(['save', 'remove', 'edit-bet', 'settle-bet'])
const editing = ref(false)
const form = ref({ title: '', stake: 20, deadline: '', bettorId: '' })

function startEditing() {
  form.value = {
    title: props.item.title,
    stake: props.item.stake,
    deadline: props.item.deadline.slice(0, 16),
    bettorId: props.item.bettorId || ''
  }
  editing.value = true
}
function save() {
  emit('save', {
    ...form.value,
    stake: Number(form.value.stake),
    deadline: new Date(form.value.deadline).toISOString()
  })
  editing.value = false
}
</script>

<template>
  <article class="managed-challenge">
    <template v-if="!editing"
      ><div>
        <span class="week-kicker">WEEK {{ item.week }} · {{ item.status }}</span>
        <h2>{{ item.title }}</h2>
        <small>{{ item.dates }} · {{ money(item.stake) }} stake · {{ item.bettor }}</small>
        <div v-if="item.bets?.length" class="managed-bets">
          <div v-for="bet in item.bets" :key="bet.id" class="managed-bet">
            <strong>{{ bet.bettor }} · {{ bet.type }}</strong
            ><span>{{ bet.selections.length }} legs · {{ bet.status }}</span
            ><small
              >{{ money(bet.stake) }} stake ·
              {{ bet.actualReturn == null ? 'No return yet' : money(bet.actualReturn) }}</small
            >
            <div class="managed-bet-actions">
              <button class="outline-button" type="button" @click="emit('edit-bet', bet)">
                Edit bet</button
              ><button class="outline-button" type="button" @click="emit('settle-bet', bet)">
                Settle bet
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="managed-actions">
        <NuxtLink class="outline-button" to="/">Open overview</NuxtLink
        ><button class="outline-button" type="button" @click="startEditing">Edit week</button
        ><button class="outline-button danger-button" type="button" @click="$emit('remove')">
          Delete
        </button>
      </div></template
    >
    <template v-else
      ><label>Title<input v-model="form.title" /></label
      ><label>Stake (€)<input v-model.number="form.stake" type="number" min="1" /></label
      ><label>Deadline<input v-model="form.deadline" type="datetime-local" /></label
      ><label
        >Assigned bettor<select v-model="form.bettorId" required>
          <option v-for="user in users" :key="user.userId" :value="user.userId">
            {{ user.displayName }}{{ user.email ? ` (${user.email})` : '' }}
          </option>
        </select></label
      >
      <div class="managed-actions">
        <button class="outline-button" type="button" @click="editing = false">Cancel</button
        ><button class="primary-button" type="button" @click="save">Save</button>
      </div></template
    >
  </article>
</template>
