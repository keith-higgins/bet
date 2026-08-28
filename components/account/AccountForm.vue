<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const client = useSupabaseClient()
const { currentUserName } = usePlayerContext()
const name = ref('')
const password = ref('')
const confirmation = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)
onMounted(async () => {
  const result = await client?.auth.getUser()
  name.value = result?.data?.user?.user_metadata?.display_name || ''
})
async function saveAccount() {
  message.value = ''
  error.value = ''
  if (password.value && password.value !== confirmation.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (password.value && password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  if (!name.value.trim()) {
    error.value = 'Please enter a display name.'
    return
  }
  loading.value = true
  const updates = { data: { display_name: name.value.trim() } }
  if (password.value) updates.password = password.value
  const { error: updateError } = await client.auth.updateUser(updates)
  loading.value = false
  if (updateError) error.value = updateError.message
  else {
    currentUserName.value = name.value.trim()
    message.value = password.value ? 'Account and password updated.' : 'Account updated.'
    password.value = ''
    confirmation.value = ''
  }
}
async function logout() {
  await client?.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <section class="auth-card account-card">
    <p class="overline">ACCOUNT SETTINGS</p>
    <h1>Your account</h1>
    <p>
      Update your name or add a password for email login. All signed-in players share the same game.
    </p>
    <form @submit.prevent="saveAccount">
      <label
        >Display name<input
          v-model="name"
          type="text"
          maxlength="60"
          placeholder="Your name"
          required /></label
      ><label
        >New password<input
          v-model="password"
          type="password"
          minlength="6"
          placeholder="Leave blank to keep current password" /></label
      ><label
        >Confirm password<input
          v-model="confirmation"
          type="password"
          minlength="6"
          placeholder="Repeat new password"
      /></label>
      <p v-if="message" class="auth-success">{{ message }}</p>
      <p v-if="error" class="auth-error">{{ error }}</p>
      <button class="primary-button full-width" :disabled="loading">
        <LoadingSpinner v-if="loading" label="Saving…" inline small />
        <template v-else>Save account →</template>
      </button>
    </form>
    <button class="logout-button" type="button" @click="logout">Log out</button>
  </section>
</template>
