<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const client = useSupabaseClient()
const { currentUserName, isAdmin } = usePlayerContext()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmation = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  const result = await client?.auth.getUser()
  name.value = result?.data?.user?.user_metadata?.display_name || ''
  email.value = result?.data?.user?.email || ''
})

function initials(value) {
  return (value || 'Player')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

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
  try {
    const { data: sessionResult } = await client.auth.getSession()
    if (!sessionResult.session) throw new Error('Please sign in again.')
    await $fetch('/api/account', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionResult.session.access_token}` },
      body: { displayName: name.value.trim(), password: password.value }
    })
    currentUserName.value = name.value.trim()
    message.value = password.value ? 'Account and password updated.' : 'Account updated.'
    password.value = ''
    confirmation.value = ''
  } catch (value) {
    error.value = value?.data?.statusMessage || value?.message || 'Unable to update account.'
  } finally {
    loading.value = false
  }
}
async function logout() {
  await client?.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="screen-pad">
    <div class="account-profile-header">
      <div class="avatar account-avatar">{{ initials(name || currentUserName) }}</div>
      <div>
        <strong>{{ name || currentUserName }}</strong>
        <span class="mono-meta">{{ email }} &middot; {{ isAdmin ? 'ADMIN' : 'PLAYER' }}</span>
      </div>
    </div>

    <form class="manage-card" @submit.prevent="saveAccount">
      <p class="builder-field-label">ACCOUNT SETTINGS</p>
      <label class="manage-field">
        <span>Display name</span>
        <input v-model="name" type="text" maxlength="60" placeholder="Your name" required />
      </label>
      <label class="manage-field">
        <span>New password</span>
        <input
          v-model="password"
          type="password"
          minlength="6"
          placeholder="Leave blank to keep current"
        />
      </label>
      <label class="manage-field">
        <span>Confirm password</span>
        <input
          v-model="confirmation"
          type="password"
          minlength="6"
          placeholder="Repeat new password"
        />
      </label>
      <p v-if="message" class="builder-hint" style="color: var(--lime)">{{ message }}</p>
      <p v-if="error" class="builder-error">{{ error }}</p>
      <button class="hero-button manage-lime-button" :disabled="loading">
        <LoadingSpinner v-if="loading" label="Saving…" inline small />
        <template v-else>Save account</template>
      </button>
    </form>

    <NuxtLink v-if="isAdmin" class="admin-link-card" to="/admin">
      <span class="admin-link-body">
        <span class="builder-field-label" style="margin-bottom: 6px">ADMIN</span>
        <strong>Manage league</strong>
        <small>Players, roles and weekly turns</small>
      </span>
      <span class="admin-link-arrow">&rarr;</span>
    </NuxtLink>

    <button type="button" class="logout-button" @click="logout">Log out</button>
  </div>
</template>
