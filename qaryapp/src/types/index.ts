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

export interface AppSettings {
  theme: ThemeMode
  arabSize: ArabSize
  showTranslation: boolean
  showTransliteration: boolean
  location: UserLocation | null
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  arabSize: 'medium',
  showTranslation: true,
  showTransliteration: false,
  location: null,
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
}

export interface DoaFavorite {
  doaId: string | number
  createdAt: string
}

export interface LastRead {
  surahNumber: number
  ayahNumber: number
  updatedAt: string
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

