import { createClient } from '@supabase/supabase-js'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login' || to.path.startsWith('/invite')) return
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) return
  const client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  const { data } = await client.auth.getSession()
  if (!data.session) return navigateTo('/login')
})
