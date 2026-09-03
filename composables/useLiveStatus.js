export function useLiveStatus() {
  const liveCount = useState('live-status-count', () => 0)
  const upcomingCount = useState('live-status-upcoming', () => 0)
  return { liveCount, upcomingCount }
}
