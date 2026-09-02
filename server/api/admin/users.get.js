import { requireAdmin, adminClient, userDirectoryRow } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = adminClient()
  const users = []

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    users.push(...(data.users || []))
    if (!data.users || data.users.length < 1000) break
  }

  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, display_name, role')
  if (profileError) throw createError({ statusCode: 500, statusMessage: profileError.message })

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
  const missingProfiles = users
    .filter((user) => !profileMap.has(user.id))
    .map((user) => ({
      id: user.id,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      role: 'player'
    }))

  if (missingProfiles.length) {
    const { error } = await client.from('profiles').insert(missingProfiles)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    missingProfiles.forEach((profile) => profileMap.set(profile.id, profile))
  }

  return {
    users: users.map((user) => userDirectoryRow(user, profileMap.get(user.id)))
  }
})
