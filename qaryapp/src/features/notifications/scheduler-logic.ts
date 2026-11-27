import type { PrayerName } from '../../types'
import {
  FIVE_PRAYERS,
  cleanPrayerTime,
  parseTimeInZone,
} from '../prayer-times/lib/prayer-calculations'
import type { AladhanDayData } from '../prayer-times/types'

export interface ScheduledPrayerTrigger {
  id: string
  prayerName: PrayerName
  label: string
  timeStr: string
  triggerAt: Date
  dateStr: string
}

/**
 * Mencari waktu sholat berikutnya yang akan datang untuk dijadwalkan oleh setTimeout.
 */
export function findNextPrayerTrigger(
  now: Date,
  days: AladhanDayData[],
  timezone: string,
  nextMonthDays?: AladhanDayData[],
): ScheduledPrayerTrigger | null {
  const allDays = [...days, ...(nextMonthDays ?? [])]
  const nowMs = now.getTime()
  let earliest: ScheduledPrayerTrigger | null = null

  for (const dayData of allDays) {
    const g = dayData.date.gregorian
    const year = Number(g.year)
    const month = Number(g.month.number)
    const day = Number(g.day)
    const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    for (const prayer of FIVE_PRAYERS) {
      const timeStr = cleanPrayerTime(dayData.timings[prayer.key])
      if (!timeStr) continue
      const triggerAt = parseTimeInZone(year, month, day, timeStr, timezone)
      if (triggerAt.getTime() > nowMs) {
        if (!earliest || triggerAt.getTime() < earliest.triggerAt.getTime()) {
          earliest = {
            id: `prayer:${dateStr}:${prayer.name}`,
            prayerName: prayer.name,
            label: prayer.label,
            timeStr,
            triggerAt,
            dateStr,
          }
        }
      }
    }
  }

  return earliest
}

/**
 * Mencari waktu sholat yang terlewat di antara `lastCheckedAt` dan `now`
 * (misalnya saat tab berada di latar belakang), beserta apakah masih baru (<= 2 menit).
 */
export function findMissedPrayersSince(
  lastCheckedAt: Date,
  now: Date,
  days: AladhanDayData[],
  timezone: string,
): Array<ScheduledPrayerTrigger & { isRecentWithin2Min: boolean }> {
  const startMs = lastCheckedAt.getTime()
  const nowMs = now.getTime()
  const results: Array<ScheduledPrayerTrigger & { isRecentWithin2Min: boolean }> = []

  if (nowMs <= startMs) return results

  for (const dayData of days) {
    const g = dayData.date.gregorian
    const year = Number(g.year)
    const month = Number(g.month.number)
    const day = Number(g.day)
    const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    for (const prayer of FIVE_PRAYERS) {
      const timeStr = cleanPrayerTime(dayData.timings[prayer.key])
      if (!timeStr) continue
      const triggerAt = parseTimeInZone(year, month, day, timeStr, timezone)
      const triggerMs = triggerAt.getTime()
      if (triggerMs > startMs && triggerMs <= nowMs) {
        results.push({
          id: `prayer:${dateStr}:${prayer.name}`,
          prayerName: prayer.name,
          label: prayer.label,
          timeStr,
          triggerAt,
          dateStr,
          isRecentWithin2Min: nowMs - triggerMs <= 2 * 60 * 1000,
        })
      }
    }
  }

  return results.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime())
}
