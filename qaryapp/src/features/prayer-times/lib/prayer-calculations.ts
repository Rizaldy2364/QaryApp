import type { PrayerName } from '../../../types'
import type { AladhanDayData, NextPrayerInfo } from '../types'

export const FIVE_PRAYERS: { key: keyof AladhanDayData['timings']; name: PrayerName; label: string }[] = [
  { key: 'Fajr', name: 'subuh', label: 'Subuh' },
  { key: 'Dhuhr', name: 'dzuhur', label: 'Dzuhur' },
  { key: 'Asr', name: 'ashar', label: 'Ashar' },
  { key: 'Maghrib', name: 'maghrib', label: 'Maghrib' },
  { key: 'Isha', name: 'isya', label: 'Isya' },
]

export function cleanPrayerTime(timeStr: string): string {
  if (!timeStr) return ''
  return timeStr.trim().split(' ')[0]
}

/**
 * Membangun waktu absolut Date (UTC) dari tahun, bulan, hari, dan string jam (HH:mm)
 * pada zona waktu IANA target (misalnya 'Asia/Jakarta', 'Europe/Amsterdam').
 */
export function parseTimeInZone(
  year: number,
  month: number, // 1-12
  day: number,
  timeStr: string,
  timezone: string,
): Date {
  const clean = cleanPrayerTime(timeStr)
  const [hours, minutes] = clean.split(':').map(Number)

  // Estimasi UTC awal
  const utcEstimate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))

  // Dapatkan komponen tanggal di zona waktu target untuk mengukur offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })

  const parts = formatter.formatToParts(utcEstimate)
  const partMap: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = Number(part.value)
    }
  }

  const targetAsUtc = Date.UTC(
    partMap.year,
    partMap.month - 1,
    partMap.day,
    partMap.hour === 24 ? 0 : partMap.hour,
    partMap.minute,
    partMap.second || 0,
  )

  const offsetDiff = targetAsUtc - utcEstimate.getTime()
  return new Date(utcEstimate.getTime() - offsetDiff)
}

/**
 * Format hitungan mundur menuju waktu sholat berikutnya
 */
export function formatCountdown(targetTime: Date, currentTime: Date): string {
  const diffMs = targetTime.getTime() - currentTime.getTime()
  if (diffMs <= 0 || diffMs < 60000) {
    return 'kurang dari 1 menit'
  }

  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `dalam ${hours} jam ${minutes} menit`
  }
  return `dalam ${minutes} menit`
}

/**
 * Hitung kemajuan (progress 0 sampai 100) antara sholat sebelumnya dan berikutnya
 */
export function calculateProgress(
  previousTime: Date,
  nextTime: Date,
  currentTime: Date,
): number {
  const total = nextTime.getTime() - previousTime.getTime()
  if (total <= 0) return 0

  const elapsed = currentTime.getTime() - previousTime.getTime()
  if (elapsed <= 0) return 0
  if (elapsed >= total) return 100

  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

/**
 * Mengambil tanggal kalender (YYYY-MM-DD) saat ini di zona waktu target
 */
export function getCurrentDateInTimezone(date: Date, timezone: string): {
  year: number
  month: number
  day: number
  dateString: string // YYYY-MM-DD
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateString = formatter.format(date) // YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number)
  return { year, month, day, dateString }
}

/**
 * Menentukan sholat berikutnya dari data kalender bulanan Aladhan
 */
export function calculateNextPrayer(
  currentTime: Date,
  days: AladhanDayData[],
  timezone: string,
  nextMonthDays?: AladhanDayData[],
): NextPrayerInfo | null {
  if (!days || days.length === 0) return null

  const { year, month, day } = getCurrentDateInTimezone(currentTime, timezone)

  // Cari data hari ini
  const todayIndex = days.findIndex((d) => {
    const g = d.date.gregorian
    return (
      Number(g.year) === year &&
      Number(g.month.number) === month &&
      Number(g.day) === day
    )
  })

  if (todayIndex === -1) return null

  const todayData = days[todayIndex]
  const todayPrayers = FIVE_PRAYERS.map((p) => {
    const timeStr = cleanPrayerTime(todayData.timings[p.key])
    const timeObj = parseTimeInZone(year, month, day, timeStr, timezone)
    return {
      name: p.name,
      label: p.label,
      timeStr,
      timeObj,
    }
  })

  // 1. Sebelum Subuh hari ini
  if (currentTime < todayPrayers[0].timeObj) {
    // Sholat sebelumnya adalah Isya kemarin
    let prevIsyaDate: Date

    if (todayIndex > 0) {
      const yesterdayData = days[todayIndex - 1]
      const prevIsyaStr = cleanPrayerTime(yesterdayData.timings.Isha)
      prevIsyaDate = parseTimeInZone(
        Number(yesterdayData.date.gregorian.year),
        Number(yesterdayData.date.gregorian.month.number),
        Number(yesterdayData.date.gregorian.day),
        prevIsyaStr,
        timezone,
      )
    } else {
      // Hari pertama dalam bulan, estimasikan 24 jam sebelum Isya hari ini
      prevIsyaDate = new Date(todayPrayers[4].timeObj.getTime() - 24 * 60 * 60 * 1000)
    }

    const nextP = todayPrayers[0]
    return {
      name: nextP.name,
      label: nextP.label,
      timeStr: nextP.timeStr,
      timeObj: nextP.timeObj,
      countdownText: formatCountdown(nextP.timeObj, currentTime),
      progress: calculateProgress(prevIsyaDate, nextP.timeObj, currentTime),
      previousPrayerName: 'isya',
      previousPrayerTime: prevIsyaDate,
    }
  }

  // 2. Di antara sholat hari ini (Subuh..Dzuhur, Dzuhur..Ashar, Ashar..Maghrib, Maghrib..Isya)
  for (let i = 0; i < todayPrayers.length - 1; i++) {
    const currentP = todayPrayers[i]
    const nextP = todayPrayers[i + 1]

    if (currentTime >= currentP.timeObj && currentTime < nextP.timeObj) {
      return {
        name: nextP.name,
        label: nextP.label,
        timeStr: nextP.timeStr,
        timeObj: nextP.timeObj,
        countdownText: formatCountdown(nextP.timeObj, currentTime),
        progress: calculateProgress(currentP.timeObj, nextP.timeObj, currentTime),
        previousPrayerName: currentP.name,
        previousPrayerTime: currentP.timeObj,
      }
    }
  }

  // 3. Setelah Isya hari ini -> Sholat berikutnya adalah Subuh besok
  const isyaToday = todayPrayers[4]
  let tomorrowSubuhDate: Date
  let tomorrowSubuhStr: string

  if (todayIndex < days.length - 1) {
    const tomorrowData = days[todayIndex + 1]
    tomorrowSubuhStr = cleanPrayerTime(tomorrowData.timings.Fajr)
    tomorrowSubuhDate = parseTimeInZone(
      Number(tomorrowData.date.gregorian.year),
      Number(tomorrowData.date.gregorian.month.number),
      Number(tomorrowData.date.gregorian.day),
      tomorrowSubuhStr,
      timezone,
    )
  } else if (nextMonthDays && nextMonthDays.length > 0) {
    // Hari terakhir dalam bulan, ambil Subuh tanggal 1 bulan berikutnya
    const firstDayNextMonth = nextMonthDays[0]
    tomorrowSubuhStr = cleanPrayerTime(firstDayNextMonth.timings.Fajr)
    tomorrowSubuhDate = parseTimeInZone(
      Number(firstDayNextMonth.date.gregorian.year),
      Number(firstDayNextMonth.date.gregorian.month.number),
      Number(firstDayNextMonth.date.gregorian.day),
      tomorrowSubuhStr,
      timezone,
    )
  } else {
    // Estimasi 24 jam setelah Subuh hari ini bila data bulan depan belum siap
    tomorrowSubuhStr = todayPrayers[0].timeStr
    tomorrowSubuhDate = new Date(todayPrayers[0].timeObj.getTime() + 24 * 60 * 60 * 1000)
  }

  return {
    name: 'subuh',
    label: 'Subuh',
    timeStr: tomorrowSubuhStr || todayPrayers[0].timeStr,
    timeObj: tomorrowSubuhDate,
    countdownText: formatCountdown(tomorrowSubuhDate, currentTime),
    progress: calculateProgress(isyaToday.timeObj, tomorrowSubuhDate, currentTime),
    previousPrayerName: 'isya',
    previousPrayerTime: isyaToday.timeObj,
  }
}
