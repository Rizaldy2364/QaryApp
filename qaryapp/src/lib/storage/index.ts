import { openDB, type IDBPDatabase } from 'idb'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type AyahBookmark,
  type CacheEntry,
  type DoaFavorite,
  type LastRead,
  type PrayerLogEntry,
  type PrayerName,
  type UserLocation,
  type DzikirProgress,
} from '../../types'

// Kunci penyimpanan localStorage
export const SETTINGS_STORAGE_KEY = 'qaryapp:settings'
export const LAST_READ_STORAGE_KEY = 'qaryapp:last-read'
export const RECENT_LOCATIONS_STORAGE_KEY = 'qaryapp:recent-locations'
export const SETTINGS_CHANGE_EVENT = 'qaryapp:settings-changed'

const DB_NAME = 'qaryapp'
const DB_VERSION = 1

interface QaryAppDB {
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

function getDatabase(): Promise<IDBPDatabase<QaryAppDB>> {
  if (!dbPromise) {
    try {
      dbPromise = openDB<QaryAppDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
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

export function getSettings(): AppSettings {
  try {
    const raw = safeLocalStorageGet(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_APP_SETTINGS
    const parsed = JSON.parse(raw)
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
      location: parsed.location ?? DEFAULT_APP_SETTINGS.location,
    }
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

export function saveLastRead(surahNumber: number, ayahNumber: number): void {
  try {
    const lastRead: LastRead = {
      surahNumber,
      ayahNumber,
      updatedAt: new Date().toISOString(),
    }
    safeLocalStorageSet(LAST_READ_STORAGE_KEY, JSON.stringify(lastRead))
  } catch (error) {
    logDevWarning('menyimpan penanda terakhir dibaca', error)
  }
}

// ==========================================
// BOOKMARK AYAT (IndexedDB / Fallback)
// ==========================================

export async function addAyahBookmark(bookmark: AyahBookmark): Promise<void> {
  // Panggil persistensi tanpa blokir
  requestPersistentStorage()
  try {
    const db = await getDatabase()
    await db.put('ayah_bookmarks', bookmark)
  } catch (error) {
    logDevWarning('menambah bookmark ayat', error)
    memoryStorage.set(`bookmark:${bookmark.id}`, bookmark)
  }
}

export async function removeAyahBookmark(id: string): Promise<void> {
  try {
    const db = await getDatabase()
    await db.delete('ayah_bookmarks', id)
  } catch (error) {
    logDevWarning('menghapus bookmark ayat', error)
    memoryStorage.delete(`bookmark:${id}`)
  }
}

export async function getAyahBookmarks(): Promise<AyahBookmark[]> {
  try {
    const db = await getDatabase()
    return await db.getAll('ayah_bookmarks')
  } catch (error) {
    logDevWarning('mengambil bookmark ayat', error)
    const fallbackList: AyahBookmark[] = []
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith('bookmark:')) fallbackList.push(v as AyahBookmark)
    }
    return fallbackList
  }
}

// ==========================================
// FAVORIT DOA (IndexedDB / Fallback)
// ==========================================

export async function addDoaFavorite(favorite: DoaFavorite): Promise<void> {
  requestPersistentStorage()
  try {
    const db = await getDatabase()
    await db.put('doa_favorites', favorite)
  } catch (error) {
    logDevWarning('menambah favorit doa', error)
    memoryStorage.set(`doa_fav:${favorite.doaId}`, favorite)
  }
}

export async function removeDoaFavorite(
  doaId: string | number,
): Promise<void> {
  try {
    const db = await getDatabase()
    await db.delete('doa_favorites', doaId)
  } catch (error) {
    logDevWarning('menghapus favorit doa', error)
    memoryStorage.delete(`doa_fav:${doaId}`)
  }
}

export async function getDoaFavorites(): Promise<DoaFavorite[]> {
  try {
    const db = await getDatabase()
    return await db.getAll('doa_favorites')
  } catch (error) {
    logDevWarning('mengambil daftar favorit doa', error)
    const fallbackList: DoaFavorite[] = []
    for (const [k, v] of memoryStorage.entries()) {
      if (k.startsWith('doa_fav:')) fallbackList.push(v as DoaFavorite)
    }
    return fallbackList
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
