import { describe, expect, it, vi } from 'vitest'
import {
  buildPushPayloadFromQueue,
  computeBackoffDelayMs,
  createQueueItemFromChange,
} from '../queue'

describe('sync queue & backoff', () => {
  it('menghitung jeda backoff eksponensial dengan batas maksimum 5 menit', () => {
    expect(computeBackoffDelayMs(0)).toBe(2000)
    expect(computeBackoffDelayMs(1)).toBe(4000)
    expect(computeBackoffDelayMs(2)).toBe(8000)
    expect(computeBackoffDelayMs(20)).toBe(5 * 60 * 1000)
  })

  it('menyusun payload push berurutan sesuai createdAt dalam batas ukuran batch', () => {
    const item1 = createQueueItemFromChange(
      {
        type: 'bookmark',
        surah: 1,
        ayah: 1,
        updatedAt: '2026-11-26T01:00:00.000Z',
        deleted: false,
      },
      1000,
    )
    const item2 = createQueueItemFromChange(
      {
        type: 'favorite',
        doaId: 'doa-tidur',
        updatedAt: '2026-11-26T01:01:00.000Z',
        deleted: true,
      },
      2000,
    )
    const item3 = createQueueItemFromChange(
      {
        type: 'lastRead',
        surah: 2,
        ayah: 255,
        updatedAt: '2026-11-26T01:02:00.000Z',
      },
      3000,
    )

    const { payload, includedIds } = buildPushPayloadFromQueue([item3, item1, item2], 2)
    expect(includedIds).toEqual(['bookmark:1:1', 'favorite:doa-tidur'])
    expect(payload.bookmarks).toHaveLength(1)
    expect(payload.favorites).toHaveLength(1)
    expect(payload.lastRead).toBeUndefined()
  })

  it('tamu tidak pernah memanggil endpoint sinkronisasi saat mengubah data lokal', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { addAyahBookmark } = await import('../../../lib/storage')

    await addAyahBookmark({
      id: '1:1',
      surahNumber: 1,
      ayahNumber: 1,
      createdAt: '2026-11-26T00:00:00.000Z',
    })

    const syncCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes('/api/sync'),
    )
    expect(syncCalls).toHaveLength(0)
    fetchSpy.mockRestore()
  })
})
