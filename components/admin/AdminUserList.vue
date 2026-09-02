<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const client = useSupabaseClient()
const users = ref([])
const drafts = reactive({})
const loading = ref(false)
const savingId = ref('')
const error = ref('')
const message = ref('')

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
  } catch (value) {
    error.value = value?.data?.statusMessage || value?.message || 'Unable to update user.'
  } finally {
    savingId.value = ''
  }
}

function formatDate(value) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

onMounted(loadUsers)
</script>

<template>
  <section class="admin-users-card">
    <div class="admin-users-heading">
      <div>
        <p class="overline">USER DIRECTORY</p>
        <h2>Players and admins</h2>
        <p>Update names, access levels, and passwords for the shared league.</p>
      </div>
      <button class="outline-button" type="button" :disabled="loading" @click="loadUsers">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="message" class="auth-success">{{ message }}</p>
    <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
    <LoadingSpinner v-if="loading && !users.length" label="Loading users…" />
    <div v-else-if="!users.length" class="admin-users-empty">No users found.</div>
    <div v-else class="admin-user-list">
      <article v-for="user in users" :key="user.userId" class="admin-user-row">
        <div class="admin-user-summary">
          <div class="avatar" :class="user.role === 'admin' ? 'purple' : 'yellow'">
            {{ user.displayName.slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <strong>{{ user.email }}</strong>
            <small
              >Joined {{ formatDate(user.createdAt) }} · Last sign-in
              {{ formatDate(user.lastSignInAt) }}</small
            >
          </div>
        </div>
        <div class="admin-user-fields">
          <label>
            Display name
            <input v-model="drafts[user.userId].displayName" maxlength="60" />
          </label>
          <label>
            Role
            <select v-model="drafts[user.userId].role">
              <option value="player">Player</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            New password
            <input
              v-model="drafts[user.userId].password"
              type="password"
              minlength="6"
              placeholder="Leave unchanged"
            />
          </label>
          <button
            class="primary-button"
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
  </section>
</template>

<style scoped>
.admin-users-card {
  grid-column: 1 / -1;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fff;
}

.admin-users-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.admin-users-heading h2 {
  margin: 0;
  font: 600 18px 'Space Grotesk';
}

.admin-users-heading p:not(.overline) {
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.admin-user-list {
  display: grid;
}

.admin-user-row {
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}

.admin-user-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.admin-user-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.admin-user-summary strong,
.admin-user-summary small {
  display: block;
}

.admin-user-summary strong {
  font-size: 12px;
}

.admin-user-summary small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.admin-user-fields {
  display: grid;
  grid-template-columns: 1.2fr 0.75fr 1.2fr auto;
  align-items: end;
  gap: 10px;
}

.admin-user-fields label {
  display: grid;
  gap: 5px;
  color: #778397;
  font-size: 10px;
}

.admin-user-fields input,
.admin-user-fields select {
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
  background: #fff;
}

.admin-users-empty {
  padding: 22px 0 4px;
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 760px) {
  .admin-users-card {
    padding: 18px;
  }

  .admin-users-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-users-heading .outline-button {
    align-self: flex-start;
  }

  .admin-user-fields {
    grid-template-columns: 1fr 1fr;
  }

  .admin-user-fields label:first-child,
  .admin-user-fields label:nth-child(3),
  .admin-user-fields .primary-button {
    grid-column: 1 / -1;
  }
}
</style>
