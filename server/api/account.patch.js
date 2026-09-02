import { requireAuthenticatedUser, adminClient } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  const user = await requireAuthenticatedUser(event)
  const body = await readBody(event)
  const displayName = String(body?.displayName || '')
    .trim()
    .slice(0, 60)
  const password = String(body?.password || '')

  if (!displayName)
    throw createError({ statusCode: 400, statusMessage: 'Display name is required.' })
  if (password && password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters.' })
  }

  const client = adminClient()
  const { data: existing, error: existingError } = await client.auth.admin.getUserById(user.id)
  if (existingError || !existing.user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found.' })
  }

  const updates = {
    user_metadata: { ...(existing.user.user_metadata || {}), display_name: displayName }
  }
  if (password) updates.password = password
  const { error: updateError } = await client.auth.admin.updateUserById(user.id, updates)
  if (updateError) throw createError({ statusCode: 400, statusMessage: updateError.message })

  const { error: profileError } = await client
    .from('profiles')
    .upsert({ id: user.id, display_name: displayName }, { onConflict: 'id' })
  if (profileError) throw createError({ statusCode: 500, statusMessage: profileError.message })

  return { ok: true, displayName }
})
