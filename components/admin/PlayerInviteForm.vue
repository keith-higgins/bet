<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const email = ref('')
const displayName = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')
const client = useSupabaseClient()

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
  <section class="admin-form-card">
    <div class="card-icon">＋</div>
    <div>
      <p class="overline">PLAYERS</p>
      <h2>Add a player</h2>
      <p>Invite your friend with a login so they can take their turn.</p>
    </div>
    <form @submit.prevent="invitePlayer">
      <label
        >Player’s name<input
          v-model="displayName"
          type="text"
          maxlength="60"
          placeholder="e.g. Alex Smith"
          required /></label
      ><label
        >Player’s email address<input
          v-model="email"
          type="email"
          placeholder="friend@example.com"
          required /></label
      ><label
        >Initial password<input
          v-model="password"
          type="password"
          minlength="6"
          placeholder="At least 6 characters"
          required /></label
      ><button class="primary-button full-width" :disabled="loading">
        {{ loading ? 'Creating player…' : 'Add player →' }}
      </button>
      <p v-if="message" class="auth-success">{{ message }}</p>
      <p v-if="error" class="auth-error">{{ error }}</p>
    </form>
  </section>
</template>
