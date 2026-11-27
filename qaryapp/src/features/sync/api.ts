import { apiFetch } from '../../lib/api-client'

export interface RemoteBookmarkItem {
  surah: number
  ayah: number
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export interface RemoteFavoriteItem {
  doaId: string
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export interface RemoteLastRead {
  surah: number
  ayah: number
  updatedAt: string
}

export interface PullSyncResponse {
  serverTime: string
  bookmarks: RemoteBookmarkItem[]
  favorites: RemoteFavoriteItem[]
  lastRead: RemoteLastRead | null
}

export interface PushSyncPayload {
  bookmarks?: Array<{
    surah: number
    ayah: number
    updatedAt: string
    deleted?: boolean
  }>
  favorites?: Array<{
    doaId: string
    updatedAt: string
    deleted?: boolean
  }>
  lastRead?: {
    surah: number
    ayah: number
    updatedAt: string
  }
}

export interface PushSyncResponse {
  serverTime: string
}

export async function pullSync(since?: string | null): Promise<PullSyncResponse> {
  const query = since ? `?since=${encodeURIComponent(since)}` : ''
  return apiFetch<PullSyncResponse>(`/sync/pull${query}`, {
    method: 'GET',
  })
}

export async function pushSync(payload: PushSyncPayload): Promise<PushSyncResponse> {
  return apiFetch<PushSyncResponse>('/sync/push', {
    method: 'POST',
    body: payload,
  })
}
