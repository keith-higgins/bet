export function useAppMeta() {
  const weekNumber = useState('app-meta-week', () => null)
  const weekTitle = useState('app-meta-week-title', () => '')
  const isYourTurn = useState('app-meta-your-turn', () => false)
  const isSettled = useState('app-meta-settled', () => false)
  const totalWeeksRecorded = useState('app-meta-weeks-recorded', () => 0)
  const playerCount = useState('app-meta-player-count', () => 0)

  return { weekNumber, weekTitle, isYourTurn, isSettled, totalWeeksRecorded, playerCount }
}
