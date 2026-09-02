export default defineEventHandler(async () => {
  return readCachedPaddyPowerOdds('champions-league')
})
