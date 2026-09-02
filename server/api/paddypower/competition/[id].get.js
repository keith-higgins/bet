export default defineEventHandler(async (event) => {
  return fetchPaddyPowerCompetition(getRouterParam(event, 'id'))
})
