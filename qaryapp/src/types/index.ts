export type ThemeMode = 'light' | 'dark' | 'system'

export type ArabSize = 'small' | 'medium' | 'large'

export interface UserLocation {
  country: string
  city: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  source: 'gps' | 'manual'
}

export type ReminderMode = 'notification' | 'notification-adzan'

export interface ReminderSettings {
  enabled: boolean
  mode: ReminderMode
}

export interface AppSettings {
  theme: ThemeMode
  arabSize: ArabSize
  showTranslation: boolean
  showTransliteration: boolean
  showTajwid: boolean
  location: UserLocation | null
  reminders: ReminderSettings
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  mode: 'notification',
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  arabSize: 'medium',
  showTranslation: true,
  showTransliteration: false,
  showTajwid: false,
  location: null,
  reminders: DEFAULT_REMINDER_SETTINGS,
}

export type NotificationEntryType =
  | 'prayer'
  | 'dzikir-pagi'
  | 'dzikir-petang'
  | 'renungan'

export interface NotificationEntry {
  id: string // Deterministik: `${type}:${dateStr}:${key}`
  type: NotificationEntryType
  title: string
  description: string
  timeLabel: string // HH:mm di zona waktu lokasi
  createdAt: string // ISO timestamp
  readAt: string | null
  targetRoute: string
  ref?: {
    prayerName?: PrayerName
    dzikirPeriod?: 'pagi' | 'petang'
    surahNumber?: number
    ayahNumber?: number
  }
}

export type PrayerName = 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'

export interface PrayerLogEntry {
  id?: string
  date: string // Format: YYYY-MM-DD
  prayer: PrayerName
  markedAt: string // Format: ISO string atau HH:mm:ss
}

export interface AyahBookmark {
  id: string // Format: `${surahNumber}:${ayahNumber}`
  surahNumber: number
  ayahNumber: number
  createdAt: string
  updatedAt?: string
  deleted?: boolean
}

export interface DoaFavorite {
  doaId: string | number
  createdAt: string
  updatedAt?: string
  deleted?: boolean
}

export interface LastRead {
  surahNumber: number
  ayahNumber: number
  updatedAt: string
}

export type SyncStatus = 'synced' | 'syncing' | 'waiting' | 'error' | 'expired'

export interface SyncQueueItem {
  id: string // 'bookmark:2:255' | 'favorite:doa-1' | 'lastRead'
  type: 'bookmark' | 'favorite' | 'lastRead'
  payload:
    | { surah: number; ayah: number; updatedAt: string; deleted: boolean }
    | { doaId: string; updatedAt: string; deleted: boolean }
  attempts: number
  nextRetryAt: number
  createdAt: string
}

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  savedAt: string
}

// ==========================================
// DOA & DZIKIR DOMAIN TYPES
// ==========================================

export type ReviewStatus = 'unreviewed' | 'reviewed'

export interface DoaCategory {
  id: string
  name: string
}

export interface Doa {
  id: string | number
  categoryId: string
  title: string
  arabic: string
  transliteration?: string
  translation: string
  source?: string
  fawaid?: string
  reviewStatus: ReviewStatus
}

export interface Dzikir {
  id: string | number
  period: 'morning' | 'evening'
  order: number
  title?: string
  arabic: string
  transliteration?: string
  translation: string
  repeatCount: number
  source?: string
  reviewStatus: ReviewStatus
}

export interface DzikirProgress {
  date: string // YYYY-MM-DD
  period: 'morning' | 'evening'
  currentIndex: number
  counts: Record<string, number>
  completedIds: (string | number)[]
  updatedAt: string
}

