<script setup>
const props = defineProps({
  open: Boolean,
  loading: Boolean,
  members: { type: Array, default: () => [] },
  users: { type: Array, default: () => [] },
  defaultBettorId: { type: String, default: '' }
})
const emit = defineEmits(['close', 'save'])
const form = ref({ title: '', stake: 20, deadline: '', bettorId: '' })
const availableUsers = computed(() => {
  const users = [...props.users, ...props.members]
  return [...new Map(users.map((user) => [user.userId, user])).values()]
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.value = {
      title: '',
      stake: 20,
      deadline: '',
      bettorId: props.defaultBettorId || availableUsers.value[0]?.userId || ''
    }
  }
)

function save() {
  emit('save', { ...form.value })
}
</script>

<template>
  <div
    v-if="open"
    class="flow-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="new-round-title"
  >
    <section class="flow-card compact-flow">
      <header class="flow-header">
        <div>
          <p class="overline">NEXT ROUND</p>
          <h2 id="new-round-title">New week</h2>
        </div>
        <button
          class="modal-close"
          type="button"
          aria-label="Close new round"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>
      <div class="flow-body">
        <p class="flow-intro">Set up the next Premier League turn.</p>
        <label>Title<input v-model="form.title" placeholder="Premier League week" /></label
        ><label>Stake (€)<input v-model.number="form.stake" type="number" min="1" /></label
        ><label v-if="availableUsers.length"
          >Assign this round to<select v-model="form.bettorId" required>
            <option v-for="user in availableUsers" :key="user.userId" :value="user.userId">
              {{ user.displayName }}{{ user.email ? ` · ${user.email}` : '' }}
            </option>
          </select></label
        >
        <p v-else class="flow-hint">
          Add players from Manage before assigning this round to someone else.
        </p>
        <label>Deadline<input v-model="form.deadline" type="datetime-local" /></label>
      </div>
      <footer class="flow-footer">
        <button class="text-button back-button" type="button" @click="$emit('close')">Cancel</button
        ><button class="primary-button" type="button" :disabled="loading" @click="save">
          {{ loading ? 'Creating…' : 'Create week →' }}
        </button>
      </footer>
    </section>
  </div>
</template>
