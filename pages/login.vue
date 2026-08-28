<template>
  <main class="auth-page">
    <div class="auth-card">
      <div class="brand auth-brand">
        <div class="brand-mark"><span /><span /></div>
        <div>
          <strong>double<span>chance</span></strong
          ><small>Premier League tracker</small>
        </div>
      </div>
      <p class="overline">PRIVATE CHALLENGE</p>
      <h1>{{ mode === 'login' ? 'Welcome back' : 'Create your account' }}</h1>
      <p>
        {{
          mode === 'login'
            ? 'Sign in to see the shared Premier League game.'
            : 'Create an account to join the weekly game.'
        }}
      </p>
      <form @submit.prevent="submit">
        <label
          >Email address<input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required /></label
        ><label
          >Password<input
            v-model="password"
            type="password"
            placeholder="At least 6 characters"
            minlength="6"
            required /></label
        ><button class="primary-button full-width" :disabled="loading">
          <LoadingSpinner v-if="loading" label="Working…" inline small />
          <template v-else>{{ mode === 'login' ? 'Log in →' : 'Create account →' }}</template>
        </button>
        <p v-if="message" class="auth-success">{{ message }}</p>
        <p v-if="error" class="auth-error">{{ error }}</p>
      </form>
      <button class="switch-auth" @click="toggleMode">
        {{
          mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Log in'
        }}</button
      ><NuxtLink to="/">Continue to dashboard</NuxtLink>
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
