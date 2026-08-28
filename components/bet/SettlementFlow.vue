<script setup>
const props = defineProps({
  open: Boolean,
  legs: { type: Array, default: () => [] },
  loading: Boolean
})
const emit = defineEmits(['close', 'save'])
const statuses = ref([])
const error = ref('')
watch(
  () => props.open,
  (value) => {
    if (value) {
      statuses.value = props.legs.map((leg) => ({ ...leg, status: leg.status || 'pending' }))
      error.value = ''
    }
  }
)
function save() {
  if (statuses.value.every((leg) => leg.status === 'pending')) {
    error.value = 'Mark at least one selection as won or lost.'
    return
  }
  emit('save', statuses.value)
}
</script>

<template>
  <div
    v-if="open"
    class="flow-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settlement-title"
  >
    <section class="flow-card">
      <header class="flow-header">
        <div>
          <p class="overline">SETTLE BET</p>
          <h2 id="settlement-title">Confirm results</h2>
        </div>
        <button
          class="modal-close"
          type="button"
          aria-label="Close settlement"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>
      <div class="flow-body">
        <p class="flow-intro">
          Mark each selection as it finishes. Pending selections keep the bet open.
        </p>
        <div class="settlement-cards">
          <label v-for="(leg, index) in statuses" :key="index" class="settlement-card"
            ><span
              ><b>{{ index + 1 }}. {{ leg.match || `Leg ${index + 1}` }}</b
              ><small>{{ leg.market }} · {{ leg.pick }}</small></span
            ><select v-model="leg.status">
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select></label
          >
        </div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </div>
      <footer class="flow-footer">
        <button class="text-button back-button" type="button" @click="$emit('close')">Cancel</button
        ><button class="primary-button" type="button" :disabled="loading" @click="save">
          <LoadingSpinner v-if="loading" label="Saving…" inline small />
          <template v-else>Save settlement →</template>
        </button>
      </footer>
    </section>
  </div>
</template>
