import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../../lib/api-client'
import {
  deleteSyncQueueItems,
  getAllAyahBookmarksRaw,
  getAllDoaFavoritesRaw,
  getLastRead,
  getSyncMeta,
  getSyncQueueItems,
  LOCAL_DATA_SYNCED_EVENT,
  putAyahBookmarkRaw,
  putDoaFavoriteRaw,
  putLastReadRaw,
  putSyncQueueItem,
  setSyncMeta,
  SYNC_DATA_CHANGE_EVENT,
  type SyncLocalChangeDetail,
} from '../../lib/storage'
import type { SyncStatus } from '../../types'
import { useAuth } from '../auth/useAuth'
import { pullSync, pushSync, type PushSyncPayload } from './api'
import { mergeBookmarks, mergeFavorites, mergeLastRead } from './merge'
import {
  buildPushPayloadFromQueue,
  computeBackoffDelayMs,
  enqueueLocalChange,
} from './queue'
import { SyncContext } from './sync-context'

const LAST_READ_DEBOUNCE_MS = 30_000
const PULL_THROTTLE_MS = 60_000
const SYNC_CURSOR_KEY = 'cursor'
const LAST_SYNCED_AT_KEY = 'lastSyncedAt'

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isOnline, markAsGuest } = useAuth()
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const isSyncingRef = useRef(false)
  const lastPullTimeRef = useRef(0)
  const retryTimerRef = useRef<number | null>(null)
  const lastReadDebounceTimerRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (lastReadDebounceTimerRef.current !== null) {
      window.clearTimeout(lastReadDebounceTimerRef.current)
      lastReadDebounceTimerRef.current = null
    }
  }, [])

  const refreshQueueCount = useCallback(async () => {
    const items = await getSyncQueueItems()
    setPendingCount(items.length)
    return items
  }, [])

  const applyPulledAndMerge = useCallback(async (since?: string | null) => {
    const pulled = await pullSync(since)
    const [localBookmarks, localFavorites] = await Promise.all([
      getAllAyahBookmarksRaw(),
      getAllDoaFavoritesRaw(),
    ])
    const localLastRead = getLastRead()

    const bookmarkMerge = mergeBookmarks(localBookmarks, pulled.bookmarks)
    const favoriteMerge = mergeFavorites(localFavorites, pulled.favorites)
    const lastReadMerge = mergeLastRead(localLastRead, pulled.lastRead)

    for (const item of bookmarkMerge.merged) {
      await putAyahBookmarkRaw(item)
    }
    for (const item of favoriteMerge.merged) {
      await putDoaFavoriteRaw(item)
    }
    if (lastReadMerge.merged) {
      putLastReadRaw(lastReadMerge.merged)
    }

    await setSyncMeta(SYNC_CURSOR_KEY, pulled.serverTime)
    await setSyncMeta(LAST_SYNCED_AT_KEY, pulled.serverTime)
    setLastSyncedAt(pulled.serverTime)

    window.dispatchEvent(new CustomEvent(LOCAL_DATA_SYNCED_EVENT))

    return {
      toPush: {
        bookmarks: since ? [] : bookmarkMerge.toPush,
        favorites: since ? [] : favoriteMerge.toPush,
        lastRead:
          !since && lastReadMerge.shouldPush && lastReadMerge.merged
            ? {
                surah: lastReadMerge.merged.surahNumber,
                ayah: lastReadMerge.merged.ayahNumber,
                updatedAt: lastReadMerge.merged.updatedAt,
              }
            : undefined,
      } satisfies PushSyncPayload,
    }
  }, [])

  const pushBatches = useCallback(async (payload: PushSyncPayload) => {
    const bookmarks = payload.bookmarks ?? []
    const favorites = payload.favorites ?? []
    let lastReadPending = payload.lastRead

    let bIdx = 0
    let fIdx = 0

    while (bIdx < bookmarks.length || fIdx < favorites.length || lastReadPending) {
      const batch: PushSyncPayload = {}
      let capacity = 500

      if (lastReadPending) {
        batch.lastRead = lastReadPending
        lastReadPending = undefined
        capacity -= 1
      }

      if (bIdx < bookmarks.length && capacity > 0) {
        const slice = bookmarks.slice(bIdx, bIdx + capacity)
        batch.bookmarks = slice
        bIdx += slice.length
        capacity -= slice.length
      }

      if (fIdx < favorites.length && capacity > 0) {
        const slice = favorites.slice(fIdx, fIdx + capacity)
        batch.favorites = slice
        fIdx += slice.length
      }

      const res = await pushSync(batch)
      await setSyncMeta(SYNC_CURSOR_KEY, res.serverTime)
      await setSyncMeta(LAST_SYNCED_AT_KEY, res.serverTime)
      setLastSyncedAt(res.serverTime)
    }
  }, [])

  const flushQueue = useCallback(async () => {
    if (!isAuthenticated) return

    while (true) {
      const items = await refreshQueueCount()
      if (items.length === 0) return

      if (!isOnline) {
        setStatus('waiting')
        return
      }

      const now = Date.now()
      const readyItems = items.filter((item) => item.nextRetryAt <= now)
      if (readyItems.length === 0) {
        setStatus('waiting')
        return
      }

      const { payload, includedIds } = buildPushPayloadFromQueue(readyItems)
      const res = await pushSync(payload)
      await deleteSyncQueueItems(includedIds)
      await setSyncMeta(SYNC_CURSOR_KEY, res.serverTime)
      await setSyncMeta(LAST_SYNCED_AT_KEY, res.serverTime)
      setLastSyncedAt(res.serverTime)
    }
  }, [isAuthenticated, isOnline, refreshQueueCount])

  const handleSyncError = useCallback(
    async (err: unknown, retryFn: () => void) => {
      if (err instanceof ApiError && err.status === 401) {
        clearTimers()
        setStatus('expired')
        markAsGuest()
        return
      }

      if (!navigator.onLine) {
        setStatus('waiting')
        return
      }

      setStatus('error')
      const items = await getSyncQueueItems()
      let maxAttempt = 0
      for (const item of items) {
        const nextAttempts = item.attempts + 1
        maxAttempt = Math.max(maxAttempt, nextAttempts)
        const delay = computeBackoffDelayMs(item.attempts)
        await putSyncQueueItem({
          ...item,
          attempts: nextAttempts,
          nextRetryAt: Date.now() + delay,
        })
      }

      const retryDelay = computeBackoffDelayMs(maxAttempt > 0 ? maxAttempt - 1 : 0)
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current)
      }
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null
        retryFn()
      }, retryDelay)
    },
    [clearTimers, markAsGuest],
  )

  const syncNowRef = useRef<() => Promise<void>>(async () => {})

  const syncNow = useCallback(async () => {
    if (!isAuthenticated) return
    if (!isOnline) {
      await refreshQueueCount()
      setStatus('waiting')
      return
    }
    if (isSyncingRef.current) return

    isSyncingRef.current = true
    setStatus('syncing')
    try {
      const cursor = await getSyncMeta<string>(SYNC_CURSOR_KEY)
      if (!cursor) {
        const { toPush } = await applyPulledAndMerge(null)
        await pushBatches(toPush)
      } else {
        await flushQueue()
        await applyPulledAndMerge(cursor)
      }
      lastPullTimeRef.current = Date.now()
      const remaining = await refreshQueueCount()
      setStatus(remaining.length > 0 ? 'waiting' : 'synced')
    } catch (err) {
      await handleSyncError(err, () => {
        void syncNowRef.current()
      })
    } finally {
      isSyncingRef.current = false
    }
  }, [
    applyPulledAndMerge,
    flushQueue,
    handleSyncError,
    isAuthenticated,
    isOnline,
    pushBatches,
    refreshQueueCount,
  ])

  useEffect(() => {
    syncNowRef.current = syncNow
  }, [syncNow])

  const runInitialSync = useCallback(async () => {
    if (!isOnline) {
      setStatus('waiting')
      return
    }
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setStatus('syncing')
    try {
      const { toPush } = await applyPulledAndMerge(null)
      await pushBatches(toPush)
      await flushQueue()
      lastPullTimeRef.current = Date.now()
      const remaining = await refreshQueueCount()
      setStatus(remaining.length > 0 ? 'waiting' : 'synced')
    } catch (err) {
      await handleSyncError(err, () => {
        void syncNow()
      })
    } finally {
      isSyncingRef.current = false
    }
  }, [
    applyPulledAndMerge,
    flushQueue,
    handleSyncError,
    isOnline,
    pushBatches,
    refreshQueueCount,
    syncNow,
  ])

  // Muat lastSyncedAt awal dan jalankan sinkronisasi saat sudah masuk
  useEffect(() => {
    void getSyncMeta<string>(LAST_SYNCED_AT_KEY).then((val) => {
      if (val) setLastSyncedAt(val)
    })
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers()
      return
    }
    if (!isOnline) {
      void getSyncQueueItems().then((items) => {
        setPendingCount(items.length)
        setStatus('waiting')
      })
      return
    }
    const now = Date.now()
    if (now - lastPullTimeRef.current >= PULL_THROTTLE_MS || lastPullTimeRef.current === 0) {
      void syncNow()
    }
  }, [clearTimers, isAuthenticated, isOnline, syncNow])

  // Dengarkan perubahan data lokal — hanya antrekan jika sudah login
  useEffect(() => {
    const handleLocalChange = (event: Event) => {
      if (!isAuthenticated) return
      const detail = (event as CustomEvent<SyncLocalChangeDetail>).detail
      if (!detail) return

      if (detail.type === 'lastRead') {
        if (lastReadDebounceTimerRef.current !== null) {
          window.clearTimeout(lastReadDebounceTimerRef.current)
        }
        lastReadDebounceTimerRef.current = window.setTimeout(() => {
          lastReadDebounceTimerRef.current = null
          void enqueueLocalChange(detail).then(() => syncNow())
        }, LAST_READ_DEBOUNCE_MS)
        return
      }

      void enqueueLocalChange(detail).then(() => syncNow())
    }

    window.addEventListener(SYNC_DATA_CHANGE_EVENT, handleLocalChange)
    return () => {
      window.removeEventListener(SYNC_DATA_CHANGE_EVENT, handleLocalChange)
    }
  }, [isAuthenticated, syncNow])

  // Tarik perubahan saat tab kembali terlihat atau kembali online (throttle 60 detik)
  useEffect(() => {
    if (!isAuthenticated) return

    const handleResume = () => {
      if (document.visibilityState !== 'visible') return
      if (!navigator.onLine) {
        setStatus('waiting')
        return
      }
      if (Date.now() - lastPullTimeRef.current >= PULL_THROTTLE_MS) {
        void syncNow()
      }
    }

    document.addEventListener('visibilitychange', handleResume)
    window.addEventListener('online', handleResume)
    return () => {
      document.removeEventListener('visibilitychange', handleResume)
      window.removeEventListener('online', handleResume)
    }
  }, [isAuthenticated, syncNow])

  useEffect(() => clearTimers, [clearTimers])

  const effectiveStatus: SyncStatus =
    !isOnline && isAuthenticated && status !== 'expired' ? 'waiting' : status

  return (
    <SyncContext.Provider
      value={{
        status: effectiveStatus,
        pendingCount,
        lastSyncedAt,
        syncNow,
        runInitialSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
