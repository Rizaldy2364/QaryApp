import type { AyahBookmark, DoaFavorite, LastRead } from '../../types'
import type {
  PushSyncPayload,
  RemoteBookmarkItem,
  RemoteFavoriteItem,
  RemoteLastRead,
} from './api'

function getTimeMs(iso: string | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function mergeBookmarks(
  localList: AyahBookmark[],
  remoteList: RemoteBookmarkItem[],
): {
  merged: AyahBookmark[]
  toPush: NonNullable<PushSyncPayload['bookmarks']>
} {
  const localMap = new Map<string, AyahBookmark>()
  for (const item of localList) {
    localMap.set(`${item.surahNumber}:${item.ayahNumber}`, item)
  }

  const remoteMap = new Map<string, RemoteBookmarkItem>()
  for (const item of remoteList) {
    remoteMap.set(`${item.surah}:${item.ayah}`, item)
  }

  const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()])
  const merged: AyahBookmark[] = []
  const toPush: NonNullable<PushSyncPayload['bookmarks']> = []

  for (const key of allKeys) {
    const local = localMap.get(key)
    const remote = remoteMap.get(key)

    if (local && !remote) {
      const updatedAt = local.updatedAt ?? local.createdAt
      const normalized: AyahBookmark = {
        ...local,
        updatedAt,
        deleted: Boolean(local.deleted),
      }
      merged.push(normalized)
      toPush.push({
        surah: local.surahNumber,
        ayah: local.ayahNumber,
        updatedAt,
        deleted: Boolean(local.deleted),
      })
      continue
    }

    if (!local && remote) {
      merged.push({
        id: `${remote.surah}:${remote.ayah}`,
        surahNumber: remote.surah,
        ayahNumber: remote.ayah,
        createdAt: remote.createdAt,
        updatedAt: remote.updatedAt,
        deleted: remote.deleted,
      })
      continue
    }

    if (local && remote) {
      const localUpdated = local.updatedAt ?? local.createdAt
      const localMs = getTimeMs(localUpdated)
      const remoteMs = getTimeMs(remote.updatedAt)

      if (localMs > remoteMs) {
        merged.push({
          ...local,
          updatedAt: localUpdated,
          deleted: Boolean(local.deleted),
        })
        toPush.push({
          surah: local.surahNumber,
          ayah: local.ayahNumber,
          updatedAt: localUpdated,
          deleted: Boolean(local.deleted),
        })
      } else {
        merged.push({
          id: `${remote.surah}:${remote.ayah}`,
          surahNumber: remote.surah,
          ayahNumber: remote.ayah,
          createdAt: remote.createdAt,
          updatedAt: remote.updatedAt,
          deleted: remote.deleted,
        })
      }
    }
  }

  return { merged, toPush }
}

export function mergeFavorites(
  localList: DoaFavorite[],
  remoteList: RemoteFavoriteItem[],
): {
  merged: DoaFavorite[]
  toPush: NonNullable<PushSyncPayload['favorites']>
} {
  const localMap = new Map<string, DoaFavorite>()
  for (const item of localList) {
    localMap.set(String(item.doaId), item)
  }

  const remoteMap = new Map<string, RemoteFavoriteItem>()
  for (const item of remoteList) {
    remoteMap.set(String(item.doaId), item)
  }

  const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()])
  const merged: DoaFavorite[] = []
  const toPush: NonNullable<PushSyncPayload['favorites']> = []

  for (const key of allKeys) {
    const local = localMap.get(key)
    const remote = remoteMap.get(key)

    if (local && !remote) {
      const updatedAt = local.updatedAt ?? local.createdAt
      merged.push({
        ...local,
        updatedAt,
        deleted: Boolean(local.deleted),
      })
      toPush.push({
        doaId: String(local.doaId),
        updatedAt,
        deleted: Boolean(local.deleted),
      })
      continue
    }

    if (!local && remote) {
      merged.push({
        doaId: remote.doaId,
        createdAt: remote.createdAt,
        updatedAt: remote.updatedAt,
        deleted: remote.deleted,
      })
      continue
    }

    if (local && remote) {
      const localUpdated = local.updatedAt ?? local.createdAt
      const localMs = getTimeMs(localUpdated)
      const remoteMs = getTimeMs(remote.updatedAt)

      if (localMs > remoteMs) {
        merged.push({
          ...local,
          updatedAt: localUpdated,
          deleted: Boolean(local.deleted),
        })
        toPush.push({
          doaId: String(local.doaId),
          updatedAt: localUpdated,
          deleted: Boolean(local.deleted),
        })
      } else {
        merged.push({
          doaId: remote.doaId,
          createdAt: remote.createdAt,
          updatedAt: remote.updatedAt,
          deleted: remote.deleted,
        })
      }
    }
  }

  return { merged, toPush }
}

export function mergeLastRead(
  local: LastRead | null,
  remote: RemoteLastRead | null,
): {
  merged: LastRead | null
  shouldPush: boolean
} {
  if (!local && !remote) {
    return { merged: null, shouldPush: false }
  }
  if (local && !remote) {
    return { merged: local, shouldPush: true }
  }
  if (!local && remote) {
    return {
      merged: {
        surahNumber: remote.surah,
        ayahNumber: remote.ayah,
        updatedAt: remote.updatedAt,
      },
      shouldPush: false,
    }
  }

  const localMs = getTimeMs(local!.updatedAt)
  const remoteMs = getTimeMs(remote!.updatedAt)

  if (localMs > remoteMs) {
    return { merged: local!, shouldPush: true }
  }

  return {
    merged: {
      surahNumber: remote!.surah,
      ayahNumber: remote!.ayah,
      updatedAt: remote!.updatedAt,
    },
    shouldPush: false,
  }
}
