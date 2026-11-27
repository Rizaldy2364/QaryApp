import { createContext } from 'react'
import type { SyncStatus } from '../../types'

export interface SyncContextValue {
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: string | null
  syncNow: () => Promise<void>
  runInitialSync: () => Promise<void>
}

export const SyncContext = createContext<SyncContextValue>({
  status: 'synced',
  pendingCount: 0,
  lastSyncedAt: null,
  syncNow: async () => {},
  runInitialSync: async () => {},
})
