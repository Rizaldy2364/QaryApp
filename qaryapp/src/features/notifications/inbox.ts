import type { NotificationEntry } from '../../types'
import {
  FIVE_PRAYERS,
  cleanPrayerTime,
  getCurrentDateInTimezone,
  parseTimeInZone,
} from '../prayer-times/lib/prayer-calculations'
import type { AladhanDayData } from '../prayer-times/types'

export interface FeaturedVerseRef {
  surah: number
  ayah: number
}

export interface GenerateInboxInput {
  now: Date
  days: AladhanDayData[]
  timezone: string
  cityName: string
  lastOpenedDate: string | null
  featuredVerses: FeaturedVerseRef[]
  surahNames: Map<number, string>
}

const WINDOW_48H_MS = 48 * 60 * 60 * 1000
const RETENTION_30D_MS = 30 * 24 * 60 * 60 * 1000
const MAX_NOTIFICATIONS = 50

export function formatTimeInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function getDayNumberHash(dateStr: string): number {
  let sum = 0
  for (let i = 0; i < dateStr.length; i++) {
    sum = (sum * 31 + dateStr.charCodeAt(i)) >>> 0
  }
  return sum
}

/**
 * Fungsi murni untuk menghasilkan entri pusat notifikasi lokal dengan ID deterministik
 * sehingga tidak pernah terjadi duplikat.
 */
export function generateInbox(input: GenerateInboxInput): {
  entries: NotificationEntry[]
  todayDateStr: string
} {
  const { now, days, timezone, cityName, lastOpenedDate, featuredVerses, surahNames } = input
  const nowMs = now.getTime()
  const earliestMs = nowMs - WINDOW_48H_MS
  const { dateString: todayDateStr } = getCurrentDateInTimezone(now, timezone)

  const entries: NotificationEntry[] = []

  for (const dayData of days) {
    const g = dayData.date.gregorian
    const year = Number(g.year)
    const month = Number(g.month.number)
    const day = Number(g.day)
    const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // 1. Lima waktu sholat dalam jendela 48 jam terakhir
    for (const prayer of FIVE_PRAYERS) {
      const timeStr = cleanPrayerTime(dayData.timings[prayer.key])
      if (!timeStr) continue
      const triggerDate = parseTimeInZone(year, month, day, timeStr, timezone)
      const triggerMs = triggerDate.getTime()

      if (triggerMs <= nowMs && triggerMs >= earliestMs) {
        entries.push({
          id: `prayer:${dateStr}:${prayer.name}`,
          type: 'prayer',
          title: `Waktu ${prayer.label}`,
          description: `Telah masuk waktu ${prayer.label} untuk wilayah ${cityName}.`,
          timeLabel: timeStr,
          createdAt: triggerDate.toISOString(),
          readAt: null,
          targetRoute: '/jadwal-sholat',
          ref: { prayerName: prayer.name },
        })
      }
    }

    // 2. Dzikir pagi (Sunrise) dan Dzikir petang (Asr) dalam jendela 48 jam terakhir
    const sunriseStr = cleanPrayerTime(dayData.timings.Sunrise)
    if (sunriseStr) {
      const sunriseDate = parseTimeInZone(year, month, day, sunriseStr, timezone)
      const sunriseMs = sunriseDate.getTime()
      if (sunriseMs <= nowMs && sunriseMs >= earliestMs) {
        entries.push({
          id: `dzikir-pagi:${dateStr}:pagi`,
          type: 'dzikir-pagi',
          title: 'Dzikir pagi',
          description: 'Saatnya membaca dzikir pagi.',
          timeLabel: sunriseStr,
          createdAt: sunriseDate.toISOString(),
          readAt: null,
          targetRoute: '/dzikir?waktu=pagi',
          ref: { dzikirPeriod: 'pagi' },
        })
      }
    }

    const asrStr = cleanPrayerTime(dayData.timings.Asr)
    if (asrStr) {
      const asrDate = parseTimeInZone(year, month, day, asrStr, timezone)
      const asrMs = asrDate.getTime()
      if (asrMs <= nowMs && asrMs >= earliestMs) {
        entries.push({
          id: `dzikir-petang:${dateStr}:petang`,
          type: 'dzikir-petang',
          title: 'Dzikir petang',
          description: 'Saatnya membaca dzikir petang.',
          timeLabel: asrStr,
          createdAt: asrDate.toISOString(),
          readAt: null,
          targetRoute: '/dzikir?waktu=petang',
          ref: { dzikirPeriod: 'petang' },
        })
      }
    }
  }

  // 3. Renungan hari ini (1 entri per hari pada pembukaan pertama hari itu)
  if (featuredVerses.length > 0 && lastOpenedDate !== todayDateStr) {
    const idx = getDayNumberHash(todayDateStr) % featuredVerses.length
    const chosen = featuredVerses[idx]
    if (chosen) {
      const surahName = surahNames.get(chosen.surah) ?? `Surah ${chosen.surah}`
      entries.push({
        id: `renungan:${todayDateStr}:harian`,
        type: 'renungan',
        title: 'Renungan hari ini',
        description: `Ayat pilihan: ${surahName}, ayat ${chosen.ayah}.`,
        timeLabel: formatTimeInZone(now, timezone),
        createdAt: now.toISOString(),
        readAt: null,
        targetRoute: `/quran/${chosen.surah}?ayat=${chosen.ayah}`,
        ref: {
          surahNumber: chosen.surah,
          ayahNumber: chosen.ayah,
        },
      })
    }
  }

  return { entries, todayDateStr }
}

/**
 * Menggabungkan entri baru tanpa menimpa status baca (readAt) entri yang sudah ada,
 * menghapus entri lebih lama dari 30 hari, dan membatasi paling banyak 50 entri terbaru.
 */
export function mergeAndPruneNotifications(
  existing: NotificationEntry[],
  incoming: NotificationEntry[],
  now: Date,
): NotificationEntry[] {
  const map = new Map<string, NotificationEntry>()

  for (const item of existing) {
    map.set(item.id, item)
  }

  for (const item of incoming) {
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  }

  const cutoffMs = now.getTime() - RETENTION_30D_MS

  return Array.from(map.values())
    .filter((item) => new Date(item.createdAt).getTime() >= cutoffMs)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_NOTIFICATIONS)
}

export type NotificationDayGroup = 'Hari ini' | 'Kemarin' | 'Sebelumnya'

export function groupNotificationsByDay(
  entries: NotificationEntry[],
  now: Date,
  timezone: string,
): Array<{ label: NotificationDayGroup; items: NotificationEntry[] }> {
  const todayStr = getCurrentDateInTimezone(now, timezone).dateString
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = getCurrentDateInTimezone(yesterdayDate, timezone).dateString

  const groups: Record<NotificationDayGroup, NotificationEntry[]> = {
    'Hari ini': [],
    Kemarin: [],
    Sebelumnya: [],
  }

  for (const item of entries) {
    const itemDateStr = getCurrentDateInTimezone(new Date(item.createdAt), timezone).dateString
    if (itemDateStr === todayStr) {
      groups['Hari ini'].push(item)
    } else if (itemDateStr === yesterdayStr) {
      groups.Kemarin.push(item)
    } else {
      groups.Sebelumnya.push(item)
    }
  }

  const result: Array<{ label: NotificationDayGroup; items: NotificationEntry[] }> = []
  for (const label of ['Hari ini', 'Kemarin', 'Sebelumnya'] as const) {
    if (groups[label].length > 0) {
      result.push({ label, items: groups[label] })
    }
  }
  return result
}
