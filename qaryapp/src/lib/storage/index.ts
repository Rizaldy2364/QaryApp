import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb'
import {
  DEFAULT_ADZAN_PRAYERS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_REMINDER_SETTINGS,
  type AppSettings,
  type AyahBookmark,
  type CacheEntry,
  type DoaFavorite,
  type LastRead,
  type NotificationEntry,
  type PrayerLogEntry,
  type PrayerName,
  type SyncQueueItem,
  type UserLocation,
  type DzikirProgress,
} from '../../types'

// Kunci penyimpanan localStorage
export const SETTINGS_STORAGE_KEY = 'qaryapp:settings'
export const LAST_READ_STORAGE_KEY = 'qaryapp:last-read'
export const RECENT_LOCATIONS_STORAGE_KEY = 'qaryapp:recent-locations'
export const SETTINGS_CHANGE_EVENT = 'qaryapp:settings-changed'
export const SYNC_DATA_CHANGE_EVENT = 'qaryapp:sync-data-changed'
export const LOCAL_DATA_SYNCED_EVENT = 'qaryapp:data-synced'

export type SyncLocalChangeDetail =
  | { type: 'bookmark'; surah: number; ayah: number; updatedAt: string; deleted: boolean }
  | { type: 'favorite'; doaId: string; updatedAt: string; deleted: boolean }
  | { type: 'lastRead'; surah: number; ayah: number; updatedAt: string }

const DB_NAME = 'qaryapp'
export const DB_VERSION = 3

export interface SyncMetaEntry {
  key: string
  value: unknown
}

export interface QaryAppDB {
  ayah_bookmarks: {
    key: string
    value: AyahBookmark
  }
  doa_favorites: {
    key: string | number
    value: DoaFavorite
  }
  prayer_logs: {
    key: string
    value: PrayerLogEntry
    indexes: { 'by-date': string }
  }
  cache: {
    key: string
    value: CacheEntry<unknown>
  }
  sync_queue: {
    key: string
    value: SyncQueueItem
  }
  sync_meta: {
    key: string
    value: SyncMetaEntry
  }
  notifications: {
    key: string
    value: NotificationEntry
    indexes: { 'by-createdAt': string }
  }
}

// ==========================================
// FALLBACK PENYIMPANAN MEMORI SEMENTARA
// (Untuk browser private mode ketat tanpa IndexedDB/localStorage)
// ==========================================
const memoryStorage = new Map<string, unknown>()
let isStorageRestricted = false

export function isRestrictedStorage(): boolean {
  return isStorageRestricted
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    isStorageRestricted = true
    return (memoryStorage.get(key) as string) ?? null
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    isStorageRestricted = true
    memoryStorage.set(key, value)
  }
}

let dbPromise: Promise<IDBPDatabase<QaryAppDB>> | null = null

function logDevWarning(action: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[QaryApp Storage] Galat saat ${action}:`, error)
  }
}

export function migrateRecordToV2<
  T extends { createdAt?: string; updatedAt?: string; deleted?: boolean },
>(record: T, fallbackNowIso: string): T & { updatedAt: string; deleted: boolean } {
  return {
    ...record,
    updatedAt: record.updatedAt ?? record.createdAt ?? fallbackNowIso,
    deleted: record.deleted ?? false,
  }
}

export async function upgradeQaryAppDB(
  db: IDBPDatabase<QaryAppDB>,
  oldVersion: number,
  transaction: IDBPTransaction<QaryAppDB, ArrayLike<keyof QaryAppDB>, 'versionchange'>,
): Promise<void> {
  if (!db.objectStoreNames.contains('ayah_bookmarks')) {
    db.createObjectStore('ayah_bookmarks', { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains('doa_favorites')) {
    db.createObjectStore('doa_favorites', { keyPath: 'doaId' })
  }
  if (!db.objectStoreNames.contains('prayer_logs')) {
    const prayerStore = db.createObjectStore('prayer_logs', {
      keyPath: 'id',
    })
    prayerStore.createIndex('by-date', 'date')
  }
  if (!db.objectStoreNames.contains('cache')) {
    db.createObjectStore('cache', { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains('sync_queue')) {
    db.createObjectStore('sync_queue', { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains('sync_meta')) {
    db.createObjectStore('sync_meta', { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains('notifications')) {
    const notifStore = db.createObjectStore('notifications', { keyPath: 'id' })
    notifStore.createIndex('by-createdAt', 'createdAt')
  }

  // Migrasi skema v1 -> v2: pertahankan seluruh data lama sambil menambahkan updatedAt & deleted
  if (oldVersion >= 1 && oldVersion < 2) {
    const nowIso = new Date().toISOString()

    const bookmarkStore = transaction.objectStore('ayah_bookmarks')
    let bookmarkCursor = await bookmarkStore.openCursor()
    while (bookmarkCursor) {
      const migrated = migrateRecordToV2(bookmarkCursor.value, nowIso)
      await bookmarkCursor.update(migrated)
      bookmarkCursor = await bookmarkCursor.continue()
    }

    const favoriteStore = transaction.objectStore('doa_favorites')
    let favoriteCursor = await favoriteStore.openCursor()
    while (favoriteCursor) {
      const migrated = migrateRecordToV2(favoriteCursor.value, nowIso)
      await favoriteCursor.update(migrated)
      favoriteCursor = await favoriteCursor.continue()
    }
  }
}

function getDatabase(): Promise<IDBPDatabase<QaryAppDB>> {
  if (!dbPromise) {
    try {
      dbPromise = openDB<QaryAppDB>(DB_NAME, DB_VERSION, {
        async upgrade(db, oldVersion, _newVersion, transaction) {
          await upgradeQaryAppDB(
            db,
            oldVersion,
            transaction as unknown as IDBPTransaction<
              QaryAppDB,
              ArrayLike<keyof QaryAppDB>,
              'versionchange'
            >,
          )
        },
      }).catch((err) => {
        isStorageRestricted = true
        throw err
      })
    } catch {
      isStorageRestricted = true
    }
  }
  return dbPromise!
}

// ==========================================
// PERSISTENSI PENYIMPANAN PERAMBAN (PERSISTENT STORAGE API)
// ==========================================
let hasAttemptedPersist = false

export async function requestPersistentStorage(): Promise<boolean> {
  if (hasAttemptedPersist) return false
  hasAttemptedPersist = true
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist()
      if (import.meta.env.DEV) {
        console.info('[QaryApp Storage] Navigator persistent storage:', isPersisted)
      }
      return isPersisted
    } catch {
      return false
    }
  }
  return false
}

// ==========================================
// PENGATURAN (LocalStorage / Fallback)
// ==========================================

export function migrateAppSettings(parsed: Partial<AppSettings> | null | undefined): AppSettings {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_APP_SETTINGS
  const rawReminders = parsed.reminders
  const mode =
    rawReminders?.mode === 'notification-adzan' ? 'notification-adzan' : 'notification'
  const rawAdzan = rawReminders?.adzanPrayers

  return {
    theme: parsed.theme ?? DEFAULT_APP_SETTINGS.theme,
    arabSize: parsed.arabSize ?? DEFAULT_APP_SETTINGS.arabSize,
    showTranslation:
      typeof parsed.showTranslation === 'boolean'
        ? parsed.showTranslation
        : DEFAULT_APP_SETTINGS.showTranslation,
    showTransliteration:
      typeof parsed.showTransliteration === 'boolean'
        ? parsed.showTransliteration
        : DEFAULT_APP_SETTINGS.showTransliteration,
    showTajwid:
      typeof parsed.showTajwid === 'boolean'
        ? parsed.showTajwid
        : DEFAULT_APP_SETTINGS.showTajwid,
    location: parsed.location ?? DEFAULT_APP_SETTINGS.location,
    reminders: {
      enabled:
        typeof rawReminders?.enabled === 'boolean'
          ? rawReminders.enabled
          : DEFAULT_REMINDER_SETTINGS.enabled,
      mode,
      adzanPrayers: {
        subuh: typeof rawAdzan?.subuh === 'boolean' ? rawAdzan.subuh : DEFAULT_ADZAN_PRAYERS.subuh,
        dzuhur: typeof rawAdzan?.dzuhur === 'boolean' ? rawAdzan.dzuhur : DEFAULT_ADZAN_PRAYERS.dzuhur,
        ashar: typeof rawAdzan?.ashar === 'boolean' ? rawAdzan.ashar : DEFAULT_ADZAN_PRAYERS.ashar,
        maghrib: typeof rawAdzan?.maghrib === 'boolean' ? rawAdzan.maghrib : DEFAULT_ADZAN_PRAYERS.maghrib,
        isya: typeof rawAdzan?.isya === 'boolean' ? rawAdzan.isya : DEFAULT_ADZAN_PRAYERS.isya,
      },
    },
  }
}

export function getSettings(): AppSettings {
  try {
    const raw = safeLocalStorageGet(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_APP_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return migrateAppSettings(parsed)
  } catch {
    return DEFAULT_APP_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    safeLocalStorageSet(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(
      new CustomEvent<AppSettings>(SETTINGS_CHANGE_EVENT, { detail: settings }),
    )
  } catch (error) {
    logDevWarning('menyimpan pengaturan', error)
  }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated: AppSettings = {
    ...current,
    ...partial,
  }
  saveSettings(updated)
  return updated
}

// ==========================================
// TERAKHIR DIBACA (LocalStorage / Fallback)
// ==========================================

export function getLastRead(): LastRead | null {
  try {
    const raw = safeLocalStorageGet(LAST_READ_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LastRead
  } catch (error) {
    logDevWarning('membaca penanda terakhir dibaca', error)
    return null
  }
}

function dispatchSyncChange(detail: SyncLocalChangeDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<SyncLocalChangeDetail>(SYNC_DATA_CHANGE_EVENT, { detail }))
}

export function saveLastRead(surahNumber: number, ayahNumber: number, updatedAt?: string): void {
  try {
    const lastRead: LastRead = {
      surahNumber,
      ayahNumber,
      updatedAt: updatedAt ?? new Date().toISOString(),
    }
    safeLocalStorageSet(LAST_READ_STORAGE_KEY, JSON.stringify(lastRead))
    if (!updatedAt) {
      dispatchSyncChange({
        type: 'lastRead',
        surah: surahNumber,
        ayah: ayahNumber,
        updatedAt: lastRead.updatedAt,
      })
    }
  } catch (error) {
    logDevWarning('menyimpan penanda terakhir dibaca', error)
  }
}

export function putLastReadRaw(lastRead: LastRead): void {
  try {
    safeLocalStorageSet(LAST_READ_STORAGE_KEY, JSON.stringify(lastRead))
  } catch (error) {
    logDevWarning('menyimpan penanda terakhir dibaca (sinkronisasi)', error)
  }
}

// ==========================================
// BOOKMARK AYAT (IndexedDB / Fallback)
// ==========================================

export async function addAyahBookmark(bookmark: AyahBookmark): Promise<void> {
  // Panggil persistensi tanpa blokir
  requestPersistentStorage()
  const nowIso = bookmark.updatedAt ?? new Date().toISOString()
  const record: AyahBookmark = {
    ...bookmark,
    updatedAt: nowIso,
    deleted: false,
  }
  try {
    const db = await getDatabase()
    await db.put('ayah_bookmarks', record)
  } catch (error) {
    logDevWarning('menambah bookmark ayat', error)
    memoryStorage.set(`bookmark:${record.id}`, record)
  }
  dispatchSyncChange({
    type: 'bookmark',
    surah: record.surahNumber,
    ayah: record.ayahNumber,
    updatedAt: nowIso,
    deleted: false,
  })
}

export async function removeAyahBookmark(id: string): Promise<void> {
  const nowIso = new Date().toISOString()
  const [surahStr, ayahStr] = id.split(':')
  const surahNumber = Number(surahStr)
  const ayahNumber = Number(ayahStr)

  try {
    const db = await getDatabase()
    const existing = await db.get('ayah_bookmarks', id)
    const tombstone: AyahBookmark = existing
      ? { ...existing, deleted: true, updatedAt: nowIso }
      : {
          id,
          surahNumber,
          ayahNumber,
          createdAt: nowIso,
          updatedAt: nowIso,
          deleted: true,
        }
    await db.put('ayah_bookmarks', tombstone)
  } catch (error) {
    logDevWarning('menghapus bookmark ayat', error)
    const existing = memoryStorage.get(`bookmark:${id}`) as AyahBookmark | undefined
    memoryStorage.set(
      `bookmark:${id}`,
      existing
        ? { ...existing, deleted: true, updatedAt: nowIso }
        : {
            id,
            surahNumber,
            ayahNumber,
            createdAt: nowIso,
            updatedAt: nowIso,
            deleted: true,
          },
    )
  }

  if (Number.isInteger(surahNumber) && Number.isInteger(ayahNumber)) {
    dispatchSyncChange({
      type: 'bookmark',
      surah: surahNumber,
      ayah: ayahNumber,
      updatedAt: nowIso,
      deleted: true,
    })
  }
}

export async function getAllAyahBookmarksRaw(): Promise<AyahBookmark[]> {
  try {
    const db = await getDatabase()
    return await db.getAll('ayah_bookmarks')
  } catch (error) {
    logDevWarning('mengambil semua bookmark ayat', error)
    const fallbackList: AyahBookmark[] = []
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith('bookmark:')) fallbackList.push(v as AyahBookmark)
    }
    return fallbackList
  }
}

export async function getAyahBookmarks(): Promise<AyahBookmark[]> {
  const all = await getAllAyahBookmarksRaw()
  return all.filter((item) => !item.deleted)
}

export async function putAyahBookmarkRaw(bookmark: AyahBookmark): Promise<void> {
  try {
    const db = await getDatabase()
    await db.put('ayah_bookmarks', bookmark)
  } catch (error) {
    logDevWarning('menyimpan bookmark ayat (sinkronisasi)', error)
    memoryStorage.set(`bookmark:${bookmark.id}`, bookmark)
  }
}

// ==========================================
// FAVORIT DOA (IndexedDB / Fallback)
// ==========================================

export async function addDoaFavorite(favorite: DoaFavorite): Promise<void> {
  requestPersistentStorage()
  const nowIso = favorite.updatedAt ?? new Date().toISOString()
  const record: DoaFavorite = {
    ...favorite,
    updatedAt: nowIso,
    deleted: false,
  }
  try {
    const db = await getDatabase()
    await db.put('doa_favorites', record)
  } catch (error) {
    logDevWarning('menambah favorit doa', error)
    memoryStorage.set(`doa_fav:${record.doaId}`, record)
  }
  dispatchSyncChange({
    type: 'favorite',
    doaId: String(record.doaId),
    updatedAt: nowIso,
    deleted: false,
  })
}

export async function removeDoaFavorite(
  doaId: string | number,
): Promise<void> {
  const nowIso = new Date().toISOString()
  try {
    const db = await getDatabase()
    let existing = await db.get('doa_favorites', doaId)
    if (!existing && typeof doaId === 'string' && /^\d+$/.test(doaId)) {
      existing = await db.get('doa_favorites', Number(doaId))
    }
    const keyToUse = existing ? existing.doaId : doaId
    const tombstone: DoaFavorite = existing
      ? { ...existing, deleted: true, updatedAt: nowIso }
      : {
          doaId: keyToUse,
          createdAt: nowIso,
          updatedAt: nowIso,
          deleted: true,
        }
    await db.put('doa_favorites', tombstone)
  } catch (error) {
    logDevWarning('menghapus favorit doa', error)
    const existing = memoryStorage.get(`doa_fav:${doaId}`) as DoaFavorite | undefined
    memoryStorage.set(
      `doa_fav:${doaId}`,
      existing
        ? { ...existing, deleted: true, updatedAt: nowIso }
        : {
            doaId,
            createdAt: nowIso,
            updatedAt: nowIso,
            deleted: true,
          },
    )
  }
  dispatchSyncChange({
    type: 'favorite',
    doaId: String(doaId),
    updatedAt: nowIso,
    deleted: true,
  })
}

export async function getAllDoaFavoritesRaw(): Promise<DoaFavorite[]> {
  try {
    const db = await getDatabase()
    return await db.getAll('doa_favorites')
  } catch (error) {
    logDevWarning('mengambil semua daftar favorit doa', error)
    const fallbackList: DoaFavorite[] = []
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith('doa_fav:')) fallbackList.push(v as DoaFavorite)
    }
    return fallbackList
  }
}

export async function getDoaFavorites(): Promise<DoaFavorite[]> {
  const all = await getAllDoaFavoritesRaw()
  return all.filter((item) => !item.deleted)
}

export async function putDoaFavoriteRaw(favorite: DoaFavorite): Promise<void> {
  try {
    const db = await getDatabase()
    await db.put('doa_favorites', favorite)
  } catch (error) {
    logDevWarning('menyimpan favorit doa (sinkronisasi)', error)
    memoryStorage.set(`doa_fav:${favorite.doaId}`, favorite)
  }
}

export async function clearLocalBookmarksAndFavorites(): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction(['ayah_bookmarks', 'doa_favorites'], 'readwrite')
    await tx.objectStore('ayah_bookmarks').clear()
    await tx.objectStore('doa_favorites').clear()
    await tx.done
  } catch (error) {
    logDevWarning('mengosongkan bookmark dan favorit lokal', error)
  }
  for (const k of Array.from(memoryStorage.keys())) {
    if (k.startsWith('bookmark:') || k.startsWith('doa_fav:')) {
      memoryStorage.delete(k)
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_DATA_SYNCED_EVENT))
  }
}

// ==========================================
// ANTREAN & META SINKRONISASI (IndexedDB)
// ==========================================

export async function putSyncQueueItem(item: SyncQueueItem): Promise<void> {
  try {
    const db = await getDatabase()
    await db.put('sync_queue', item)
  } catch (error) {
    logDevWarning('menyimpan antrean sinkronisasi', error)
    memoryStorage.set(`sync_queue:${item.id}`, item)
  }
}

export async function getSyncQueueItems(): Promise<SyncQueueItem[]> {
  try {
    const db = await getDatabase()
    return await db.getAll('sync_queue')
  } catch (error) {
    logDevWarning('mengambil antrean sinkronisasi', error)
    const items: SyncQueueItem[] = []
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith('sync_queue:')) items.push(v as SyncQueueItem)
    }
    return items
  }
}

export async function deleteSyncQueueItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    const db = await getDatabase()
    const tx = db.transaction('sync_queue', 'readwrite')
    for (const id of ids) {
      await tx.store.delete(id)
    }
    await tx.done
  } catch (error) {
    logDevWarning('menghapus antrean sinkronisasi', error)
    for (const id of ids) {
      memoryStorage.delete(`sync_queue:${id}`)
    }
  }
}

export async function clearSyncState(): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction(['sync_queue', 'sync_meta'], 'readwrite')
    await tx.objectStore('sync_queue').clear()
    await tx.objectStore('sync_meta').clear()
    await tx.done
  } catch (error) {
    logDevWarning('mengosongkan status sinkronisasi', error)
  }
  for (const k of Array.from(memoryStorage.keys())) {
    if (k.startsWith('sync_queue:') || k.startsWith('sync_meta:')) {
      memoryStorage.delete(k)
    }
  }
}

export async function getSyncMeta<T>(key: string): Promise<T | null> {
  try {
    const db = await getDatabase()
    const entry = await db.get('sync_meta', key)
    return entry ? (entry.value as T) : null
  } catch (error) {
    logDevWarning('membaca meta sinkronisasi', error)
    const entry = memoryStorage.get(`sync_meta:${key}`) as SyncMetaEntry | undefined
    return entry ? (entry.value as T) : null
  }
}

export async function setSyncMeta<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDatabase()
    await db.put('sync_meta', { key, value })
  } catch (error) {
    logDevWarning('menyimpan meta sinkronisasi', error)
    memoryStorage.set(`sync_meta:${key}`, { key, value })
  }
}

// ==========================================
// CATATAN SHOLAT (IndexedDB / Fallback)
// ==========================================

export async function markPrayer(
  date: string,
  prayer: PrayerName,
  markedAt?: string,
): Promise<void> {
  try {
    const db = await getDatabase()
    const id = `${date}:${prayer}`
    const entry: PrayerLogEntry = {
      id,
      date,
      prayer,
      markedAt: markedAt ?? new Date().toISOString(),
    }
    await db.put('prayer_logs', entry)
  } catch (error) {
    logDevWarning('menandai sholat', error)
    memoryStorage.set(`prayer_log:${date}:${prayer}`, {
      date,
      prayer,
      markedAt: markedAt ?? new Date().toISOString(),
    })
  }
}

export async function unmarkPrayer(
  date: string,
  prayer: PrayerName,
): Promise<void> {
  try {
    const db = await getDatabase()
    const id = `${date}:${prayer}`
    await db.delete('prayer_logs', id)
  } catch (error) {
    logDevWarning('membatalkan tanda sholat', error)
    memoryStorage.delete(`prayer_log:${date}:${prayer}`)
  }
}

export async function getPrayerLogs(date: string): Promise<PrayerLogEntry[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('prayer_logs', 'by-date', date)
  } catch (error) {
    logDevWarning('mengambil catatan sholat', error)
    const logs: PrayerLogEntry[] = []
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith(`prayer_log:${date}:`)) logs.push(v as PrayerLogEntry)
    }
    return logs
  }
}

// ==========================================
// CACHE UMUM (IndexedDB dengan Proteksi Kuota & LRU)
// ==========================================

/**
 * Membersihkan 20% cache tertua saat mendekati atau mengalami QuotaExceededError
 */
async function pruneOldestCache(db: IDBPDatabase<QaryAppDB>): Promise<void> {
  try {
    const allCache = await db.getAll('cache')
    if (allCache.length <= 2) return
    // Urutkan berdasarkan waktu simpan tertua
    allCache.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())
    const countToDelete = Math.max(1, Math.floor(allCache.length * 0.25))
    const tx = db.transaction('cache', 'readwrite')
    for (let i = 0; i < countToDelete; i++) {
      await tx.store.delete(allCache[i].key)
    }
    await tx.done
    if (import.meta.env.DEV) {
      console.warn(`[QaryApp Storage] Menghapus ${countToDelete} entri cache tertua untuk melegakan kuota.`)
    }
  } catch {
    // Abaikan kegagalan pruning
  }
}

export async function setCache<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDatabase()
    const entry: CacheEntry<T> = {
      key,
      value,
      savedAt: new Date().toISOString(),
    }
    try {
      await db.put('cache', entry as CacheEntry<unknown>)
    } catch (putErr) {
      // Tangani QuotaExceededError dengan menghapus cache tertua lalu coba lagi
      if (putErr instanceof Error && (putErr.name === 'QuotaExceededError' || putErr.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        await pruneOldestCache(db)
        await db.put('cache', entry as CacheEntry<unknown>)
      } else {
        throw putErr
      }
    }
  } catch (error) {
    logDevWarning('menyimpan cache', error)
    memoryStorage.set(`cache:${key}`, {
      key,
      value,
      savedAt: new Date().toISOString(),
    })
  }
}

export async function getCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await getDatabase()
    const entry = await db.get('cache', key)
    if (!entry) return null
    return entry as CacheEntry<T>
  } catch (error) {
    logDevWarning('mengambil cache', error)
    const fallback = memoryStorage.get(`cache:${key}`)
    return fallback ? (fallback as CacheEntry<T>) : null
  }
}

// ==========================================
// RIWAYAT LOKASI (LocalStorage, maks 5)
// ==========================================

export function getRecentLocations(): UserLocation[] {
  try {
    const raw = safeLocalStorageGet(RECENT_LOCATIONS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as UserLocation[]
  } catch (error) {
    logDevWarning('membaca riwayat lokasi', error)
    return []
  }
}

export function addRecentLocation(location: UserLocation): void {
  try {
    const current = getRecentLocations()
    const filtered = current.filter(
      (item) =>
        !(
          item.city.toLowerCase() === location.city.toLowerCase() &&
          item.country.toLowerCase() === location.country.toLowerCase()
        ),
    )
    const updated = [location, ...filtered].slice(0, 5)
    safeLocalStorageSet(RECENT_LOCATIONS_STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    logDevWarning('menyimpan riwayat lokasi', error)
  }
}

// ==========================================
// KEMAJUAN DZIKIR (LocalStorage)
// ==========================================

export function getDzikirStorageKey(
  date: string,
  period: 'morning' | 'evening',
): string {
  return `qaryapp:dzikir-progress:${date}:${period}`
}

export function getDzikirProgress(
  date: string,
  period: 'morning' | 'evening',
): DzikirProgress | null {
  try {
    const key = getDzikirStorageKey(date, period)
    const raw = safeLocalStorageGet(key)
    if (!raw) return null
    return JSON.parse(raw) as DzikirProgress
  } catch (error) {
    logDevWarning('membaca kemajuan dzikir', error)
    return null
  }
}

export function saveDzikirProgress(progress: DzikirProgress): void {
  try {
    const key = getDzikirStorageKey(progress.date, progress.period)
    safeLocalStorageSet(key, JSON.stringify(progress))
  } catch (error) {
    logDevWarning('menyimpan kemajuan dzikir', error)
  }
}

export function resetDzikirProgress(
  date: string,
  period: 'morning' | 'evening',
): void {
  try {
    const key = getDzikirStorageKey(date, period)
    try {
      localStorage.removeItem(key)
    } catch {
      memoryStorage.delete(key)
    }
  } catch (error) {
    logDevWarning('mengatur ulang kemajuan dzikir', error)
  }
}


// ==========================================
// PUSAT NOTIFIKASI LOKAL (IndexedDB / Fallback)
// ==========================================

export const NOTIFICATIONS_CHANGE_EVENT = 'qaryapp:notifications-changed'
export const NOTIF_LAST_OPENED_DATE_KEY = 'qaryapp:notif-last-opened-date'

export function dispatchNotificationsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGE_EVENT))
}

export async function getStoredNotifications(): Promise<NotificationEntry[]> {
  try {
    const db = await getDatabase()
    const list = await db.getAll('notifications')
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch (error) {
    logDevWarning('mengambil daftar notifikasi', error)
    const list: NotificationEntry[] = []
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith('notif:')) list.push(v as NotificationEntry)
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }
}

export async function replaceStoredNotifications(
  entries: NotificationEntry[],
): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction('notifications', 'readwrite')
    await tx.store.clear()
    for (const entry of entries) {
      await tx.store.put(entry)
    }
    await tx.done
  } catch (error) {
    logDevWarning('menyimpan daftar notifikasi', error)
    for (const k of Array.from(memoryStorage.keys())) {
      if (k.startsWith('notif:')) memoryStorage.delete(k)
    }
    for (const entry of entries) {
      memoryStorage.set(`notif:${entry.id}`, entry)
    }
  }
  dispatchNotificationsChanged()
}

export async function upsertNotificationEntry(
  entry: NotificationEntry,
): Promise<void> {
  try {
    const db = await getDatabase()
    const existing = await db.get('notifications', entry.id)
    if (!existing) {
      await db.put('notifications', entry)
      dispatchNotificationsChanged()
    }
  } catch (error) {
    logDevWarning('menambah notifikasi', error)
    if (!memoryStorage.has(`notif:${entry.id}`)) {
      memoryStorage.set(`notif:${entry.id}`, entry)
      dispatchNotificationsChanged()
    }
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const readAt = new Date().toISOString()
  try {
    const db = await getDatabase()
    const existing = await db.get('notifications', id)
    if (existing && !existing.readAt) {
      await db.put('notifications', { ...existing, readAt })
      dispatchNotificationsChanged()
    }
  } catch (error) {
    logDevWarning('menandai notifikasi dibaca', error)
    const existing = memoryStorage.get(`notif:${id}`) as NotificationEntry | undefined
    if (existing && !existing.readAt) {
      memoryStorage.set(`notif:${id}`, { ...existing, readAt })
      dispatchNotificationsChanged()
    }
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const readAt = new Date().toISOString()
  try {
    const db = await getDatabase()
    const all = await db.getAll('notifications')
    const tx = db.transaction('notifications', 'readwrite')
    let changed = false
    for (const item of all) {
      if (!item.readAt) {
        await tx.store.put({ ...item, readAt })
        changed = true
      }
    }
    await tx.done
    if (changed) dispatchNotificationsChanged()
  } catch (error) {
    logDevWarning('menandai semua notifikasi dibaca', error)
    let changed = false
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith('notif:')) {
        const entry = v as NotificationEntry
        if (!entry.readAt) {
          memoryStorage.set(k, { ...entry, readAt })
          changed = true
        }
      }
    }
    if (changed) dispatchNotificationsChanged()
  }
}

export function getLastNotificationOpenedDate(): string | null {
  return safeLocalStorageGet(NOTIF_LAST_OPENED_DATE_KEY)
}

export function setLastNotificationOpenedDate(dateStr: string): void {
  safeLocalStorageSet(NOTIF_LAST_OPENED_DATE_KEY, dateStr)
}
