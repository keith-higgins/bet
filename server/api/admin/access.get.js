import { requireAdmin } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  return { ok: true, userId: user.id }
})
