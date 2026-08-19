import { createClient } from '@supabase/supabase-js'
export function useSupabaseClient() { const config = useRuntimeConfig(); return config.public.supabaseUrl && config.public.supabaseAnonKey ? createClient(config.public.supabaseUrl, config.public.supabaseAnonKey) : null }
