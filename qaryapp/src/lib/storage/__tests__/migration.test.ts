import { describe, expect, it } from 'vitest'
import type { IDBPDatabase, IDBPTransaction } from 'idb'
import { migrateRecordToV2, upgradeQaryAppDB, type QaryAppDB } from '../index'

describe('IndexedDB v1 -> v2 migration', () => {
  it('migrateRecordToV2 mempertahankan createdAt dan menambah updatedAt serta deleted: false', () => {
    const v1Bookmark = {
      id: '2:255',
      surahNumber: 2,
      ayahNumber: 255,
      createdAt: '2026-11-20T08:00:00.000Z',
    }
    const migrated = migrateRecordToV2(v1Bookmark, '2026-11-26T00:00:00.000Z')
    expect(migrated).toEqual({
      id: '2:255',
      surahNumber: 2,
      ayahNumber: 255,
      createdAt: '2026-11-20T08:00:00.000Z',
      updatedAt: '2026-11-20T08:00:00.000Z',
      deleted: false,
    })
  })

  it('upgradeQaryAppDB menjaga seluruh bookmark & favorit lama serta membuat store sync_queue & sync_meta', async () => {
    const storeNames = new Set(['ayah_bookmarks', 'doa_favorites', 'prayer_logs', 'cache'])
    const storeData: Record<string, Array<Record<string, unknown>>> = {
      ayah_bookmarks: [
        {
          id: '1:1',
          surahNumber: 1,
          ayahNumber: 1,
          createdAt: '2026-11-19T12:00:00.000Z',
        },
      ],
      doa_favorites: [
        {
          doaId: 'doa-bangun',
          createdAt: '2026-11-19T13:00:00.000Z',
        },
      ],
    }

    const mockDb = {
      objectStoreNames: {
        contains: (name: string) => storeNames.has(name),
      },
      createObjectStore: (name: string) => {
        storeNames.add(name)
        storeData[name] = []
        return { createIndex: () => {} }
      },
    } as unknown as IDBPDatabase<QaryAppDB>

    const createCursor = (records: Array<Record<string, unknown>>, idx = 0): unknown => {
      if (idx >= records.length) return null
      return {
        value: records[idx],
        update: async (nextVal: Record<string, unknown>) => {
          records[idx] = nextVal
        },
        continue: async () => createCursor(records, idx + 1),
      }
    }

    const mockTx = {
      objectStore: (name: string) => ({
        openCursor: async () => createCursor(storeData[name] ?? [], 0),
      }),
    } as unknown as IDBPTransaction<QaryAppDB, ArrayLike<keyof QaryAppDB>, 'versionchange'>

    await upgradeQaryAppDB(mockDb, 1, mockTx)

    expect(storeNames.has('sync_queue')).toBe(true)
    expect(storeNames.has('sync_meta')).toBe(true)

    expect(storeData.ayah_bookmarks[0]).toEqual({
      id: '1:1',
      surahNumber: 1,
      ayahNumber: 1,
      createdAt: '2026-11-19T12:00:00.000Z',
      updatedAt: '2026-11-19T12:00:00.000Z',
      deleted: false,
    })

    expect(storeData.doa_favorites[0]).toEqual({
      doaId: 'doa-bangun',
      createdAt: '2026-11-19T13:00:00.000Z',
      updatedAt: '2026-11-19T13:00:00.000Z',
      deleted: false,
    })
  })
})
