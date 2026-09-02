import { createClient } from '@supabase/supabase-js'

function bearerToken(event) {
  return (getHeader(event, 'authorization') || '').replace(/^Bearer\s+/i, '').trim()
}

function publicClient() {
  const config = useRuntimeConfig()
  return createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
}

export function adminClient() {
  const config = useRuntimeConfig()
  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)
}

export async function requireAuthenticatedUser(event) {
  const token = bearerToken(event)
  const config = useRuntimeConfig()
  if (!token || !config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    throw createError({ statusCode: 401, statusMessage: 'You must be signed in.' })
  }

  const { data, error } = await publicClient().auth.getUser(token)
  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Your session has expired.' })
  }
  return data.user
}

export async function requireAdmin(event) {
  const user = await requireAuthenticatedUser(event)
  const config = useRuntimeConfig()
  if (!config.supabaseServiceRoleKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Supabase admin configuration is missing.'
    })
  }

  const { data: profile, error } = await adminClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (profile?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required.' })
  }
  return user
}

export function userDirectoryRow(user, profile = {}) {
  return {
    userId: user.id,
    email: user.email || '',
    displayName:
      profile.display_name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'User',
    role: profile.role || 'player',
    lastSignInAt: user.last_sign_in_at || null,
    createdAt: user.created_at || null
  }
}
