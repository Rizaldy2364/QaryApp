import { describe, expect, it } from 'vitest'
import { mergeBookmarks, mergeFavorites, mergeLastRead } from '../merge'

describe('sync merge functions', () => {
  it('menggabungkan bookmark lokal dan server serta menghormati updatedAt terbaru dan penanda hapus', () => {
    const { merged, toPush } = mergeBookmarks(
      [
        // Lokal lebih baru (dihapus)
        {
          id: '2:255',
          surahNumber: 2,
          ayahNumber: 255,
          createdAt: '2026-11-25T10:00:00.000Z',
          updatedAt: '2026-11-26T02:00:00.000Z',
          deleted: true,
        },
        // Hanya di lokal
        {
          id: '18:10',
          surahNumber: 18,
          ayahNumber: 10,
          createdAt: '2026-11-26T01:00:00.000Z',
        },
      ],
      [
        // Server lebih lama untuk 2:255
        {
          surah: 2,
          ayah: 255,
          createdAt: '2026-11-25T10:00:00.000Z',
          updatedAt: '2026-11-26T01:00:00.000Z',
          deleted: false,
        },
        // Hanya di server
        {
          surah: 1,
          ayah: 1,
          createdAt: '2026-11-25T09:00:00.000Z',
          updatedAt: '2026-11-25T09:00:00.000Z',
          deleted: false,
        },
      ],
    )

    expect(merged).toHaveLength(3)
    const b255 = merged.find((b) => b.id === '2:255')
    expect(b255?.deleted).toBe(true)

    const b1 = merged.find((b) => b.id === '1:1')
    expect(b1?.deleted).toBe(false)

    // Yang perlu didorong ke server adalah 2:255 (lokal lebih baru) dan 18:10 (hanya di lokal)
    expect(toPush).toHaveLength(2)
    expect(toPush.map((i) => `${i.surah}:${i.ayah}`).sort()).toEqual(['18:10', '2:255'])
  })

  it('menggabungkan favorit doa dengan aturan updatedAt terbaru menang', () => {
    const { merged, toPush } = mergeFavorites(
      [
        {
          doaId: 'doa-1',
          createdAt: '2026-11-25T10:00:00.000Z',
          updatedAt: '2026-11-25T10:00:00.000Z',
          deleted: false,
        },
      ],
      [
        {
          doaId: 'doa-1',
          createdAt: '2026-11-25T10:00:00.000Z',
          updatedAt: '2026-11-26T05:00:00.000Z',
          deleted: true,
        },
        {
          doaId: 'doa-2',
          createdAt: '2026-11-26T04:00:00.000Z',
          updatedAt: '2026-11-26T04:00:00.000Z',
          deleted: false,
        },
      ],
    )

    expect(merged).toHaveLength(2)
    expect(merged.find((f) => f.doaId === 'doa-1')?.deleted).toBe(true)
    expect(merged.find((f) => f.doaId === 'doa-2')?.deleted).toBe(false)
    expect(toPush).toHaveLength(0)
  })

  it('memilih posisi baca (lastRead) dengan updatedAt terbaru', () => {
    const localOlder = mergeLastRead(
      { surahNumber: 2, ayahNumber: 10, updatedAt: '2026-11-26T01:00:00.000Z' },
      { surah: 3, ayah: 25, updatedAt: '2026-11-26T02:00:00.000Z' },
    )
    expect(localOlder.merged?.surahNumber).toBe(3)
    expect(localOlder.shouldPush).toBe(false)

    const localNewer = mergeLastRead(
      { surahNumber: 18, ayahNumber: 5, updatedAt: '2026-11-26T03:00:00.000Z' },
      { surah: 3, ayah: 25, updatedAt: '2026-11-26T02:00:00.000Z' },
    )
    expect(localNewer.merged?.surahNumber).toBe(18)
    expect(localNewer.shouldPush).toBe(true)
  })
})
