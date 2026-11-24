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

let dbPromise: Promise<IDBPDatabase<QaryAppDB>> | null = null

function logDevWarning(action: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[QaryApp Storage] Galat saat ${action}:`, error)
  }
}

function getDatabase(): Promise<IDBPDatabase<QaryAppDB>> {
  if (!dbPromise) {
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
    })
  }
  return dbPromise
}

// ==========================================
// PENGATURAN (LocalStorage)
// ==========================================

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
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
  } catch (error) {
    logDevWarning('membaca pengaturan', error)
    return DEFAULT_APP_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(
      new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: settings }),
    )
  } catch (error) {
    logDevWarning('menyimpan pengaturan', error)
  }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated: AppSettings = { ...current, ...partial }
  saveSettings(updated)
  return updated
}

// ==========================================
// TERAKHIR DIBACA (LocalStorage)
// ==========================================

export function getLastRead(): LastRead | null {
  try {
    const raw = localStorage.getItem(LAST_READ_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LastRead
  } catch (error) {
    logDevWarning('membaca terakhir dibaca', error)
    return null
  }
}

export function saveLastRead(lastRead: LastRead): void {
  try {
    localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(lastRead))
  } catch (error) {
    logDevWarning('menyimpan terakhir dibaca', error)
  }
}

// ==========================================
// BOOKMARK AYAT (IndexedDB)
// ==========================================

export async function addAyahBookmark(bookmark: AyahBookmark): Promise<void> {
  try {
    const db = await getDatabase()
    await db.put('ayah_bookmarks', bookmark)
  } catch (error) {
    logDevWarning('menambah bookmark ayat', error)
  }
}

export async function removeAyahBookmark(id: string): Promise<void> {
  try {
    const db = await getDatabase()
    await db.delete('ayah_bookmarks', id)
  } catch (error) {
    logDevWarning('menghapus bookmark ayat', error)
  }
}

export async function getAyahBookmarks(): Promise<AyahBookmark[]> {
  try {
    const db = await getDatabase()
    return await db.getAll('ayah_bookmarks')
  } catch (error) {
    logDevWarning('mengambil daftar bookmark ayat', error)
    return []
  }
}

export async function isAyahBookmarked(id: string): Promise<boolean> {
  try {
    const db = await getDatabase()
    const item = await db.get('ayah_bookmarks', id)
    return item !== undefined
  } catch (error) {
    logDevWarning('memeriksa bookmark ayat', error)
    return false
  }
}

// ==========================================
// FAVORIT DOA (IndexedDB)
// ==========================================

export async function addDoaFavorite(favorite: DoaFavorite): Promise<void> {
  try {
    const db = await getDatabase()
    await db.put('doa_favorites', favorite)
  } catch (error) {
    logDevWarning('menambah favorit doa', error)
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
  }
}

export async function getDoaFavorites(): Promise<DoaFavorite[]> {
  try {
    const db = await getDatabase()
    return await db.getAll('doa_favorites')
  } catch (error) {
    logDevWarning('mengambil daftar favorit doa', error)
    return []
  }
}

export async function isDoaFavorite(doaId: string | number): Promise<boolean> {
  try {
    const db = await getDatabase()
    const item = await db.get('doa_favorites', doaId)
    return item !== undefined
  } catch (error) {
    logDevWarning('memeriksa favorit doa', error)
    return false
  }
}

// ==========================================
// CATATAN SHOLAT (IndexedDB)
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
  }
}

export async function getPrayerLogs(date: string): Promise<PrayerLogEntry[]> {
  try {
    const db = await getDatabase()
    return await db.getAllFromIndex('prayer_logs', 'by-date', date)
  } catch (error) {
    logDevWarning('mengambil catatan sholat', error)
    return []
  }
}

// ==========================================
// CACHE UMUM (IndexedDB)
// ==========================================

export async function setCache<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDatabase()
    const entry: CacheEntry<T> = {
      key,
      value,
      savedAt: new Date().toISOString(),
    }
    await db.put('cache', entry as CacheEntry<unknown>)
  } catch (error) {
    logDevWarning('menyimpan cache', error)
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
    return null
  }
}

// ==========================================
// RIWAYAT LOKASI (LocalStorage, maks 5)
// ==========================================

export function getRecentLocations(): UserLocation[] {
  try {
    const raw = localStorage.getItem(RECENT_LOCATIONS_STORAGE_KEY)
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
    // Hapus duplikat berdasarkan nama kota & negara
    const filtered = current.filter(
      (item) =>
        !(
          item.city.toLowerCase() === location.city.toLowerCase() &&
          item.country.toLowerCase() === location.country.toLowerCase()
        ),
    )
    const updated = [location, ...filtered].slice(0, 5)
    localStorage.setItem(RECENT_LOCATIONS_STORAGE_KEY, JSON.stringify(updated))
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
    const raw = localStorage.getItem(key)
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
    localStorage.setItem(key, JSON.stringify(progress))
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
    localStorage.removeItem(key)
  } catch (error) {
    logDevWarning('mereset kemajuan dzikir', error)
  }
}
