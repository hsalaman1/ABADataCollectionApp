import { useEffect, useState } from 'react'
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '../services/sync'

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  useEffect(() => subscribeSyncStatus(setStatus), [])
  return status
}
