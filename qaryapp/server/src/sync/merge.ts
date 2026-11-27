const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

/**
 * Membatasi stempel waktu klien agar tidak melebihi waktu server + 5 menit.
 */
export function clampClientTimestamp(clientTime: Date, serverTime: Date): Date {
  const maxAllowedMs = serverTime.getTime() + MAX_CLOCK_SKEW_MS
  if (clientTime.getTime() > maxAllowedMs) {
    return new Date(maxAllowedMs)
  }
  return clientTime
}

export interface LwwRecord {
  updatedAt: Date
  deleted: boolean
}

/**
 * Fungsi murni untuk menentukan apakah perubahan masuk (incoming)
 * memenangkan konflik last-write-wins dibanding data tersimpan (existing).
 */
export function shouldApplyLww(
  existing: Pick<LwwRecord, 'updatedAt'> | null | undefined,
  incomingUpdatedAt: Date,
): boolean {
  if (!existing) return true
  return incomingUpdatedAt.getTime() >= existing.updatedAt.getTime()
}

export interface BookmarkSyncInput {
  surah: number
  ayah: number
  updatedAt: string
  deleted?: boolean
}

export interface DoaFavoriteSyncInput {
  doaId: string
  updatedAt: string
  deleted?: boolean
}

/**
 * Menggabungkan daftar perubahan bookmark berulang dalam satu batch berdasarkan LWW
 * sebelum ditulis ke basis data agar tidak ada duplikat kunci utama dalam satu transaksi.
 */
export function deduplicateBookmarksLww(
  items: BookmarkSyncInput[],
  serverTime: Date,
): Array<{ surah: number; ayah: number; updatedAt: Date; deleted: boolean }> {
  const map = new Map<string, { surah: number; ayah: number; updatedAt: Date; deleted: boolean }>()

  for (const item of items) {
    const key = `${item.surah}:${item.ayah}`
    const clamped = clampClientTimestamp(new Date(item.updatedAt), serverTime)
    const existing = map.get(key)
    if (shouldApplyLww(existing, clamped)) {
      map.set(key, {
        surah: item.surah,
        ayah: item.ayah,
        updatedAt: clamped,
        deleted: Boolean(item.deleted),
      })
    }
  }

  return Array.from(map.values())
}

export function deduplicateFavoritesLww(
  items: DoaFavoriteSyncInput[],
  serverTime: Date,
): Array<{ doaId: string; updatedAt: Date; deleted: boolean }> {
  const map = new Map<string, { doaId: string; updatedAt: Date; deleted: boolean }>()

  for (const item of items) {
    const clamped = clampClientTimestamp(new Date(item.updatedAt), serverTime)
    const existing = map.get(item.doaId)
    if (shouldApplyLww(existing, clamped)) {
      map.set(item.doaId, {
        doaId: item.doaId,
        updatedAt: clamped,
        deleted: Boolean(item.deleted),
      })
    }
  }

  return Array.from(map.values())
}
