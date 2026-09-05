export function useAppMeta() {
  const weekTitle = useState('app-meta-week-title', () => '')
  const isSettled = useState('app-meta-settled', () => false)
  const totalWeeksRecorded = useState('app-meta-weeks-recorded', () => 0)
  const playerCount = useState('app-meta-player-count', () => 0)

  return { weekTitle, isSettled, totalWeeksRecorded, playerCount }
}
