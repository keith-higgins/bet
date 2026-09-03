<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const client = useSupabaseClient()
// Editing a player here (name, role) changes data the shared dashboard state
// also holds (assignable users, leaderboard names) — refresh it too, or Home
// and League keep showing the old values until a hard reload.
const dashboard = reactive(useDashboard())
const users = ref([])
const drafts = reactive({})
const loading = ref(false)
const savingId = ref('')
const error = ref('')
const message = ref('')
const openUserId = ref(null)

function sessionHeaders(session) {
  return { Authorization: `Bearer ${session.access_token}` }
}

function setDraft(user) {
  drafts[user.userId] = {
    displayName: user.displayName,
    role: user.role,
    password: ''
  }
}

async function loadUsers() {
  if (!client) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await client.auth.getSession()
    if (!data.session) throw new Error('Please sign in again.')
    const result = await $fetch('/api/admin/users', { headers: sessionHeaders(data.session) })
    users.value = result.users || []
    users.value.forEach(setDraft)
  } catch (value) {
    error.value = value?.data?.statusMessage || value?.message || 'Unable to load users.'
  } finally {
    loading.value = false
  }
}

async function saveUser(user) {
  const draft = drafts[user.userId]
  if (!draft) return
  savingId.value = user.userId
  error.value = ''
  message.value = ''
  try {
    const { data } = await client.auth.getSession()
    if (!data.session) throw new Error('Please sign in again.')
    const result = await $fetch(`/api/admin/users/${user.userId}`, {
      method: 'PATCH',
      headers: sessionHeaders(data.session),
      body: draft
    })
    const index = users.value.findIndex((item) => item.userId === user.userId)
    if (index !== -1) users.value[index] = result.user
    setDraft(result.user)
    message.value = `${result.user.displayName} updated.`
    await dashboard.loadDashboard()
  } catch (value) {
    error.value = value?.data?.statusMessage || value?.message || 'Unable to update user.'
  } finally {
    savingId.value = ''
  }
}

function toggle(userId) {
  openUserId.value = openUserId.value === userId ? null : userId
}

onMounted(loadUsers)
</script>

<template>
  <div class="manage-user-list">
    <p v-if="message" class="builder-hint" style="color: var(--lime)">{{ message }}</p>
    <p v-if="error" class="builder-error" role="alert">{{ error }}</p>
    <LoadingSpinner v-if="loading && !users.length" label="Loading users…" />
    <div v-else-if="!users.length" class="acca-empty">No users found.</div>
    <div v-else class="league-rows">
      <article v-for="user in users" :key="user.userId" class="league-row-card manage-user-card">
        <button type="button" class="manage-user-summary" @click="toggle(user.userId)">
          <div class="avatar" :class="user.role === 'admin' ? 'purple' : 'yellow'">
            {{ user.displayName.slice(0, 2).toUpperCase() }}
          </div>
          <div class="league-row-main">
            <strong>{{ user.displayName }}</strong>
            <span class="mono-meta">{{ user.email }}</span>
          </div>
          <span class="status-pill" :class="user.role === 'admin' ? 'won' : 'upcoming'">{{
            user.role.toUpperCase()
          }}</span>
        </button>
        <div v-if="openUserId === user.userId" class="manage-user-edit">
          <label class="manage-field">
            <span>Display name</span>
            <input v-model="drafts[user.userId].displayName" maxlength="60" />
          </label>
          <label class="manage-field">
            <span>Role</span>
            <select v-model="drafts[user.userId].role">
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label class="manage-field">
            <span>New password</span>
            <input
              v-model="drafts[user.userId].password"
              type="password"
              minlength="6"
              placeholder="Leave unchanged"
            />
          </label>
          <button
            class="hero-button manage-lime-button"
            type="button"
            :disabled="savingId === user.userId"
            @click="saveUser(user)"
          >
            <LoadingSpinner v-if="savingId === user.userId" label="Saving…" inline small />
            <template v-else>Save changes</template>
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
