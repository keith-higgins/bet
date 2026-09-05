<script setup>
const props = defineProps({
  open: Boolean,
  loading: Boolean
})
const emit = defineEmits(['close', 'save'])
const form = ref({ title: '', stake: 20, deadline: '' })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.value = { title: '', stake: 20, deadline: '' }
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
        <p class="flow-intro">Set up the next Premier League week.</p>
        <label>Title<input v-model="form.title" placeholder="Premier League week" /></label
        ><label>Stake (€)<input v-model.number="form.stake" type="number" min="1" /></label
        ><label>Deadline<input v-model="form.deadline" type="datetime-local" /></label>
      </div>
      <footer class="flow-footer">
        <button class="text-button back-button" type="button" @click="$emit('close')">Cancel</button
        ><button class="primary-button" type="button" :disabled="loading" @click="save">
          <LoadingSpinner v-if="loading" label="Creating…" inline small />
          <template v-else>Create week →</template>
        </button>
      </footer>
    </section>
  </div>
</template>
