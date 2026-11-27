import { describe, expect, it } from 'vitest'
import {
  clampClientTimestamp,
  deduplicateBookmarksLww,
  deduplicateFavoritesLww,
  shouldApplyLww,
} from './merge.js'

describe('sync LWW merge helpers', () => {
  it('membatasi waktu klien agar tidak melampaui serverTime + 5 menit', () => {
    const serverTime = new Date('2026-11-26T00:00:00.000Z')
    const futureClient = new Date('2026-11-26T01:00:00.000Z')
    const normalClient = new Date('2026-11-26T00:02:00.000Z')

    expect(clampClientTimestamp(futureClient, serverTime).toISOString()).toBe(
      '2026-11-26T00:05:00.000Z',
    )
    expect(clampClientTimestamp(normalClient, serverTime).toISOString()).toBe(
      '2026-11-26T00:02:00.000Z',
    )
  })

  it('memilih timestamp lebih baru pada konflik last-write-wins', () => {
    const t1 = new Date('2026-11-26T00:00:00.000Z')
    const t2 = new Date('2026-11-26T00:01:00.000Z')

    expect(shouldApplyLww(null, t1)).toBe(true)
    expect(shouldApplyLww({ updatedAt: t2 }, t1)).toBe(false)
    expect(shouldApplyLww({ updatedAt: t1 }, t2)).toBe(true)
    expect(shouldApplyLww({ updatedAt: t2 }, t2)).toBe(true)
  })

  it('menggabungkan duplikat bookmark dan favorit dalam batch menggunakan LWW', () => {
    const serverTime = new Date('2026-11-26T00:10:00.000Z')

    const bookmarks = deduplicateBookmarksLww(
      [
        { surah: 2, ayah: 255, updatedAt: '2026-11-26T00:05:00.000Z', deleted: false },
        { surah: 2, ayah: 255, updatedAt: '2026-11-26T00:06:00.000Z', deleted: true },
        { surah: 2, ayah: 255, updatedAt: '2026-11-26T00:04:00.000Z', deleted: false },
      ],
      serverTime,
    )
    expect(bookmarks).toHaveLength(1)
    expect(bookmarks[0]?.deleted).toBe(true)

    const favorites = deduplicateFavoritesLww(
      [
        { doaId: 'doa-1', updatedAt: '2026-11-26T00:01:00.000Z', deleted: true },
        { doaId: 'doa-1', updatedAt: '2026-11-26T00:03:00.000Z', deleted: false },
      ],
      serverTime,
    )
    expect(favorites).toHaveLength(1)
    expect(favorites[0]?.deleted).toBe(false)
  })
})
