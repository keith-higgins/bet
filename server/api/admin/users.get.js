import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization') || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '')

  if (
    !accessToken ||
    !config.public.supabaseUrl ||
    !config.public.supabaseAnonKey ||
    !config.supabaseServiceRoleKey
  ) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Supabase user directory configuration is missing.'
    })
  }

  const publicClient = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  const { data: userResult, error: userError } = await publicClient.auth.getUser(accessToken)
  if (userError || !userResult.user) {
    throw createError({ statusCode: 401, statusMessage: 'Your session has expired.' })
  }

  const adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)
  const users = []
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    users.push(...(data.users || []))
    if (!data.users || data.users.length < 1000) break
  }

  const userOptions = users.map((user) => ({
    userId: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
  }))
  if (!userOptions.some((user) => user.userId === userResult.user.id)) {
    userOptions.unshift({
      userId: userResult.user.id,
      email: userResult.user.email || '',
      displayName:
        userResult.user.user_metadata?.display_name || userResult.user.email?.split('@')[0] || 'You'
    })
  }

  return { users: userOptions }
})
