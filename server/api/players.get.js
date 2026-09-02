import { requireAuthenticatedUser, adminClient, userDirectoryRow } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  await requireAuthenticatedUser(event)
  const client = adminClient()
  const [{ data: users, error: usersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      client.from('profiles').select('id, display_name, role')
    ])

  if (usersError) throw createError({ statusCode: 500, statusMessage: usersError.message })
  if (profilesError) throw createError({ statusCode: 500, statusMessage: profilesError.message })

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
  return {
    players: (users?.users || []).map((user) => {
      const row = userDirectoryRow(user, profileMap.get(user.id))
      return { userId: row.userId, displayName: row.displayName, role: row.role }
    })
  }
})
