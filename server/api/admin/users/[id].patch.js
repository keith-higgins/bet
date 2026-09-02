import { requireAdmin, adminClient } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const userId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const displayName = String(body?.displayName ?? '')
    .trim()
    .slice(0, 60)
  const role = String(body?.role || 'player')
  const password = String(body?.password || '')

  if (!userId) throw createError({ statusCode: 400, statusMessage: 'User ID is required.' })
  if (!displayName)
    throw createError({ statusCode: 400, statusMessage: 'Display name is required.' })
  if (!['player', 'admin'].includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid user role.' })
  }
  if (password && password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters.' })
  }

  const client = adminClient()
  if (actor.id === userId && role !== 'admin') {
    const { count, error } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    if ((count || 0) <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'The last admin cannot be demoted.' })
    }
  }

  const { data: existing, error: existingError } = await client.auth.admin.getUserById(userId)
  if (existingError || !existing.user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found.' })
  }

  const userUpdates = {
    user_metadata: { ...(existing.user.user_metadata || {}), display_name: displayName }
  }
  if (password) userUpdates.password = password
  const { error: updateError } = await client.auth.admin.updateUserById(userId, userUpdates)
  if (updateError) throw createError({ statusCode: 400, statusMessage: updateError.message })

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .upsert({ id: userId, display_name: displayName, role }, { onConflict: 'id' })
    .select('id, display_name, role')
    .single()
  if (profileError) throw createError({ statusCode: 500, statusMessage: profileError.message })

  return {
    ok: true,
    user: {
      userId,
      email: existing.user.email || '',
      displayName: profile.display_name,
      role: profile.role,
      lastSignInAt: existing.user.last_sign_in_at || null,
      createdAt: existing.user.created_at || null
    }
  }
})
