import { useContext } from 'react'
import { SyncContext } from './sync-context'

export function useSync() {
  return useContext(SyncContext)
}
