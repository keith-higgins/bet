<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const email = ref('')
const displayName = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')
const client = useSupabaseClient()
const emit = defineEmits(['created'])

async function invitePlayer() {
  loading.value = true
  message.value = ''
  error.value = ''
  try {
    const { data } = await client.auth.getSession()
    if (!data.session) throw new Error('Please sign in before inviting a player.')
    await $fetch('/api/admin/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      body: { email: email.value, displayName: displayName.value, password: password.value }
    })
    message.value = `Player account created for ${email.value}.`
    emit('created')
    email.value = ''
    displayName.value = ''
    password.value = ''
  } catch (value) {
    error.value = value?.data?.statusMessage || value?.message || 'Unable to create the player.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="manage-card" @submit.prevent="invitePlayer">
    <p class="builder-field-label">ADD A PLAYER</p>
    <label class="manage-field">
      <span>Player's name</span>
      <input
        v-model="displayName"
        type="text"
        maxlength="60"
        placeholder="e.g. Alex Smith"
        required
      />
    </label>
    <label class="manage-field">
      <span>Player's email address</span>
      <input v-model="email" type="email" placeholder="friend@example.com" required />
    </label>
    <label class="manage-field">
      <span>Initial password</span>
      <input
        v-model="password"
        type="password"
        minlength="6"
        placeholder="At least 6 characters"
        required
      />
    </label>
    <button class="hero-button manage-lime-button" :disabled="loading">
      <LoadingSpinner v-if="loading" label="Creating player…" inline small />
      <template v-else>Add player &rarr;</template>
    </button>
    <p v-if="message" class="builder-hint" style="color: var(--lime)">{{ message }}</p>
    <p v-if="error" class="builder-error">{{ error }}</p>
  </form>
</template>
