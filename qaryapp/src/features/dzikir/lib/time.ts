import {
  cleanPrayerTime,
  parseTimeInZone,
} from '../../prayer-times/lib/prayer-calculations'
import type { AladhanDayData } from '../../prayer-times/types'

/**
 * Menentukan apakah waktu saat ini masuk periode Dzikir Pagi (sebelum waktu Ashar)
 * atau Dzikir Petang (mulai masuk waktu Ashar).
 *
 * Bila jadwal sholat belum tersedia, menggunakan cadangan waktu perangkat (sebelum 15.00 = pagi).
 */
export function isMorningDzikirTime(
  todayData: AladhanDayData | null,
  timezone: string,
  nowDate: Date = new Date(),
): boolean {
  if (todayData && todayData.timings && todayData.timings.Asr) {
    try {
      const asrStr = cleanPrayerTime(todayData.timings.Asr)
      const g = todayData.date.gregorian
      const asrTime = parseTimeInZone(
        Number(g.year),
        Number(g.month.number),
        Number(g.day),
        asrStr,
        timezone,
      )
      return nowDate < asrTime
    } catch {
      // Cadangan ke jam jika kalkulasi gagal
    }
  }

  // Cadangan jam lokal perangkat: pagi sebelum jam 15:00
  return nowDate.getHours() < 15
}
