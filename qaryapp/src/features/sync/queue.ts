import {
  putSyncQueueItem,
  type SyncLocalChangeDetail,
} from '../../lib/storage'
import type { SyncQueueItem } from '../../types'
import type { PushSyncPayload } from './api'

const BASE_BACKOFF_MS = 2_000
const MAX_BACKOFF_MS = 5 * 60 * 1_000

export function computeBackoffDelayMs(attempts: number): number {
  const safeAttempts = Math.max(0, Math.floor(attempts))
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, safeAttempts))
}

export function createQueueItemFromChange(
  detail: SyncLocalChangeDetail,
  nowMs = Date.now(),
): SyncQueueItem {
  const nowIso = new Date(nowMs).toISOString()

  if (detail.type === 'bookmark') {
    return {
      id: `bookmark:${detail.surah}:${detail.ayah}`,
      type: 'bookmark',
      payload: {
        surah: detail.surah,
        ayah: detail.ayah,
        updatedAt: detail.updatedAt,
        deleted: detail.deleted,
      },
      attempts: 0,
      nextRetryAt: 0,
      createdAt: nowIso,
    }
  }

  if (detail.type === 'favorite') {
    return {
      id: `favorite:${detail.doaId}`,
      type: 'favorite',
      payload: {
        doaId: detail.doaId,
        updatedAt: detail.updatedAt,
        deleted: detail.deleted,
      },
      attempts: 0,
      nextRetryAt: 0,
      createdAt: nowIso,
    }
  }

  return {
    id: 'lastRead',
    type: 'lastRead',
    payload: {
      surah: detail.surah,
      ayah: detail.ayah,
      updatedAt: detail.updatedAt,
      deleted: false,
    },
    attempts: 0,
    nextRetryAt: 0,
    createdAt: nowIso,
  }
}

export async function enqueueLocalChange(detail: SyncLocalChangeDetail): Promise<void> {
  const item = createQueueItemFromChange(detail)
  await putSyncQueueItem(item)
}

export function buildPushPayloadFromQueue(
  items: SyncQueueItem[],
  maxItems = 500,
): { payload: PushSyncPayload; includedIds: string[] } {
  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const slice = sorted.slice(0, maxItems)

  const bookmarks: NonNullable<PushSyncPayload['bookmarks']> = []
  const favorites: NonNullable<PushSyncPayload['favorites']> = []
  let lastRead: PushSyncPayload['lastRead'] | undefined
  const includedIds: string[] = []

  for (const item of slice) {
    includedIds.push(item.id)
    if (item.type === 'bookmark') {
      const p = item.payload as { surah: number; ayah: number; updatedAt: string; deleted: boolean }
      bookmarks.push({
        surah: p.surah,
        ayah: p.ayah,
        updatedAt: p.updatedAt,
        deleted: p.deleted,
      })
    } else if (item.type === 'favorite') {
      const p = item.payload as { doaId: string; updatedAt: string; deleted: boolean }
      favorites.push({
        doaId: p.doaId,
        updatedAt: p.updatedAt,
        deleted: p.deleted,
      })
    } else if (item.type === 'lastRead') {
      const p = item.payload as { surah: number; ayah: number; updatedAt: string }
      lastRead = {
        surah: p.surah,
        ayah: p.ayah,
        updatedAt: p.updatedAt,
      }
    }
  }

  const payload: PushSyncPayload = {}
  if (bookmarks.length > 0) payload.bookmarks = bookmarks
  if (favorites.length > 0) payload.favorites = favorites
  if (lastRead) payload.lastRead = lastRead

  return { payload, includedIds }
}
