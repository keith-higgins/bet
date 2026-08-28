<template>
  <main class="auth-page">
    <div class="auth-card">
      <p class="overline">YOU’RE INVITED</p>
      <h1>{{ statusTitle }}</h1>
      <p>{{ statusMessage }}</p>
      <div v-if="!signedIn" class="invite-preview">
        <strong>The Weekly Punt</strong><small>Weekly Premier League betting league</small>
      </div>
      <NuxtLink v-if="signedIn" class="primary-button full-width" to="/">Open dashboard →</NuxtLink
      ><NuxtLink v-else class="primary-button full-width" to="/login"
        >Continue with email login →</NuxtLink
      >
    </div>
  </main>
</template>
<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const statusTitle = ref('Accepting invite')
const statusMessage = ref('We’re signing you in and joining the weekly game…')
const signedIn = ref(false)
const config = useRuntimeConfig()
const supabase = useSupabaseClient()
let authSubscription

onMounted(async () => {
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    statusTitle.value = 'Supabase is not configured'
    statusMessage.value = 'Add the Supabase environment variables before accepting this invite.'
    return
  }
  const checkSession = async (session) => {
    if (!session) return
    signedIn.value = true
    statusTitle.value = 'You’re in'
    statusMessage.value = 'Your account is ready. Redirecting to the dashboard…'
    await navigateTo('/')
  }
  const current = await supabase.auth.getSession()
  await checkSession(current.data.session)
  const listener = supabase.auth.onAuthStateChange((_event, session) => {
    checkSession(session)
  })
  authSubscription = listener.data.subscription
})
onUnmounted(() => authSubscription?.unsubscribe())
</script>
