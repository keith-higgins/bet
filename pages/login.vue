<template>
  <main class="login-screen">
    <div class="login-brand">
      <div class="topbar-mark" />
      <strong>the weekly punt</strong>
    </div>
    <p class="login-overline">PRIVATE LEAGUE</p>
    <h1 class="login-headline">One bettor.<br />One bet.<br />Every week.</h1>
    <p class="login-subcopy">
      {{
        mode === 'login'
          ? "Sign in to see whose turn it is and how badly it's going."
          : 'Create an account to join the weekly game.'
      }}
    </p>
    <form class="login-form" @submit.prevent="submit">
      <label class="login-field"
        >EMAIL<input v-model="email" type="email" placeholder="you@example.com" required
      /></label>
      <label class="login-field"
        >PASSWORD<input
          v-model="password"
          type="password"
          placeholder="At least 6 characters"
          minlength="6"
          required
      /></label>
      <p v-if="message" class="builder-hint" style="color: var(--lime)">{{ message }}</p>
      <p v-if="error" class="builder-error">{{ error }}</p>
      <button class="hero-button login-submit" :disabled="loading">
        <LoadingSpinner v-if="loading" label="Working…" inline small />
        <template v-else>{{ mode === 'login' ? 'Log in' : 'Create account' }}</template>
      </button>
    </form>
    <button class="login-switch" @click="toggleMode">
      {{ mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Log in' }}
    </button>
    <NuxtLink class="login-switch" to="/">Continue to dashboard</NuxtLink>
    <div class="login-spacer" />
    <div class="login-footer">
      <span class="login-footer-dot" />SHARED LEAGUE &middot; PREMIER LEAGUE 25/26
    </div>
  </main>
</template>
<script setup>
import { useSupabaseClient } from '~/lib/supabase'

const mode = ref('login')
const email = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')
const config = useRuntimeConfig()
const supabase = useSupabaseClient()
const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
  message.value = ''
  error.value = ''
}
async function submit() {
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    error.value = 'Supabase is not configured yet.'
    return
  }
  loading.value = true
  message.value = ''
  error.value = ''
  try {
    const result =
      mode.value === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
        : await supabase.auth.signUp({ email: email.value, password: password.value })
    if (result.error) throw result.error
    if (mode.value === 'signup' && !result.data.session)
      message.value = 'Account created. Check your email if confirmation is enabled.'
    else await navigateTo('/')
  } catch (authError) {
    error.value = authError?.message || 'Unable to authenticate.'
  } finally {
    loading.value = false
  }
}
</script>
