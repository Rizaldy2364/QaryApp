import type { PrayerName } from '../../types'

export interface AladhanTimings {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Sunset: string
  Maghrib: string
  Isha: string
  Imsak: string
  Midnight: string
  Firstthird: string
  Lastthird: string
}

export interface AladhanHijriDate {
  date: string
  format: string
  day: string
  month: {
    number: number
    en: string
    ar: string
    days?: number
  }
  year: string
  designation: {
    abbreviated: string
    expanded: string
  }
}

export interface AladhanGregorianDate {
  date: string
  format: string
  day: string
  month: {
    number: number
    en: string
  }
  year: string
}

export interface AladhanMeta {
  latitude: number
  longitude: number
  timezone: string
  method: {
    id: number
    name: string
  }
}

export interface AladhanDayData {
  timings: AladhanTimings
  date: {
    readable: string
    timestamp: string
    gregorian: AladhanGregorianDate
    hijri: AladhanHijriDate
  }
  meta: AladhanMeta
}

export interface AladhanCalendarResponse {
  code: number
  status: string
  data: AladhanDayData[]
}

export interface NextPrayerInfo {
  name: PrayerName
  label: string
  timeStr: string // "11:25"
  timeObj: Date
  countdownText: string // "dalam 1 jam 23 menit"
  progress: number // 0 sampai 100
  previousPrayerName?: PrayerName
  previousPrayerTime?: Date
}
