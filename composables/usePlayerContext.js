export function usePlayerContext() {
  const players = useState('players', () => [])
  const currentUserId = useState('current-user-id', () => null)
  const currentUserName = useState('current-user-name', () => 'You')

  function setPeople(nextPlayers, userId, userName) {
    players.value = nextPlayers || []
    if (userId !== undefined) currentUserId.value = userId
    if (userName) currentUserName.value = userName
    const currentPlayer = players.value.find((player) => player.userId === currentUserId.value)
    if (currentPlayer?.displayName) currentUserName.value = currentPlayer.displayName
  }

  const nextPlayer = computed(() =>
    players.value.find((player) => player.userId !== currentUserId.value)
  )
  return { players, currentUserId, currentUserName, nextPlayer, setPeople }
}
