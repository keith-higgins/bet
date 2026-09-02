import { useSupabaseClient } from '~/lib/supabase'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login' || to.path.startsWith('/invite')) return
  if (import.meta.server) return
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) return
  const client = useSupabaseClient()
  const { data } = await client.auth.getSession()
  if (!data.session) return navigateTo('/login')

  const { currentUserId, currentUserRole } = usePlayerContext()
  currentUserId.value = data.session.user.id
  if (to.path === '/admin' || to.path.startsWith('/challenges')) {
    try {
      await $fetch('/api/admin/access', {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      })
      currentUserRole.value = 'admin'
    } catch (error) {
      if (error.statusCode === 403) return navigateTo('/')
    }
  }
})
