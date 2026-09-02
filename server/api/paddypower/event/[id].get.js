export default defineEventHandler(async (event) => {
  return fetchPaddyPowerEvent(getRouterParam(event, 'id'))
})
