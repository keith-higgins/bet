import { createClient } from '@supabase/supabase-js'
let browserClient

export function useSupabaseClient() {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) return null
  if (import.meta.client) {
    browserClient ||= createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
    return browserClient
  }
  return createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
}
