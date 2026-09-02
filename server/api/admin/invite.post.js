import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const email = String(body?.email || '')
    .trim()
    .toLowerCase()
  const displayName = String(body?.displayName || '')
    .trim()
    .slice(0, 60)
  const password = String(body?.password || '')
  if (!email || !email.includes('@'))
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  if (password.length < 6)
    throw createError({
      statusCode: 400,
      statusMessage: 'The initial password must be at least 6 characters.'
    })
  const config = useRuntimeConfig()
  if (
    !config.public.supabaseUrl ||
    !config.public.supabaseAnonKey ||
    !config.supabaseServiceRoleKey
  )
    throw createError({
      statusCode: 503,
      statusMessage: 'Supabase admin configuration is missing.'
    })
  const adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)
  const { data: created, error: inviteError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName || email.split('@')[0] }
  })
  if (inviteError) throw createError({ statusCode: 400, statusMessage: inviteError.message })
  return { ok: true, email, userId: created.user.id }
})
