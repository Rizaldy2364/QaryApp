import { describe, it, expect } from 'vitest'
import {
  cleanPrayerTime,
  parseTimeInZone,
  calculateNextPrayer,
  formatCountdown,
  calculateProgress,
} from '../prayer-calculations'
import { formatIndonesianHijriDate } from '../hijri-dates'
import type { AladhanDayData, AladhanHijriDate } from '../../types'

function createMockDay(
  day: number,
  month: number,
  year: number,
  timezone: string,
  timings: Partial<AladhanDayData['timings']> = {},
): AladhanDayData {
  return {
    timings: {
      Fajr: timings.Fajr ?? '04:15',
      Sunrise: timings.Sunrise ?? '05:30',
      Dhuhr: timings.Dhuhr ?? '11:45',
      Asr: timings.Asr ?? '15:00',
      Sunset: timings.Sunset ?? '17:50',
      Maghrib: timings.Maghrib ?? '17:50',
      Isha: timings.Isha ?? '19:00',
      Imsak: timings.Imsak ?? '04:05',
      Midnight: '23:45',
      Firstthird: '21:40',
      Lastthird: '01:50',
    },
    date: {
      readable: `${day} Nov ${year}`,
      timestamp: '1763942400',
      gregorian: {
        date: `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
        format: 'DD-MM-YYYY',
        day: String(day),
        month: { number: month, en: 'November' },
        year: String(year),
      },
      hijri: {
        date: `${day}-06-1448`,
        format: 'DD-MM-YYYY',
        day: String(day),
        month: { number: 6, en: 'Jumada al-akhirah', ar: '' },
        year: '1448',
        designation: { abbreviated: 'AH', expanded: 'Anno Hegirae' },
      },
    },
    meta: {
      latitude: -7.7956,
      longitude: 110.3695,
      timezone,
      method: { id: 20, name: 'KEMENAG' },
    },
  }
}

describe('Logika Jadwal Sholat (Prayer Times)', () => {
  it('cleanPrayerTime menghapus akhiran zona waktu', () => {
    expect(cleanPrayerTime('03:50 (WIB)')).toBe('03:50')
    expect(cleanPrayerTime('11:25')).toBe('11:25')
    expect(cleanPrayerTime('')).toBe('')
  })

  it('formatIndonesianHijriDate memetakan nama bulan Hijriah ke bahasa Indonesia', () => {
    const mockHijri: AladhanHijriDate = {
      date: '14-06-1448',
      format: 'DD-MM-YYYY',
      day: '14',
      month: { number: 6, en: 'Jumada al-akhirah', ar: '' },
      year: '1448',
      designation: { abbreviated: 'AH', expanded: 'Anno Hegirae' },
    }
    expect(formatIndonesianHijriDate(mockHijri)).toBe('14 Jumadilakhir 1448 H')
  })

  it('parseTimeInZone menghasilkan waktu absolut yang konsisten pada Asia/Jakarta', () => {
    const parsed = parseTimeInZone(2026, 11, 24, '04:15', 'Asia/Jakarta')
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    expect(formatter.format(parsed)).toBe('04:15')
  })

  it('parseTimeInZone bekerja benar pada zona waktu berbeda (Asia/Kuala_Lumpur)', () => {
    const parsed = parseTimeInZone(2026, 11, 24, '05:30', 'Asia/Kuala_Lumpur')
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    expect(formatter.format(parsed)).toBe('05:30')
  })

  it('parseTimeInZone menangani zona waktu dengan DST (Europe/Amsterdam)', () => {
    // 29 Maret 2026 adalah hari pergantian waktu musim panas di Amsterdam (CET -> CEST, UTC+1 -> UTC+2)
    const parsed = parseTimeInZone(2026, 3, 29, '15:30', 'Europe/Amsterdam')
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    expect(formatter.format(parsed)).toBe('15:30')
  })

  describe('calculateNextPrayer', () => {
    const tz = 'Asia/Jakarta'
    const days = [
      createMockDay(23, 11, 2026, tz),
      createMockDay(24, 11, 2026, tz, {
        Fajr: '04:15',
        Dhuhr: '11:45',
        Asr: '15:00',
        Maghrib: '17:50',
        Isha: '19:00',
      }),
      createMockDay(25, 11, 2026, tz),
    ]

    it('menentukan sholat berikutnya saat siang hari (antara Dzuhur dan Ashar)', () => {
      // 24 Nov 2026 pukul 13:00 WIB
      const current = parseTimeInZone(2026, 11, 24, '13:00', tz)
      const result = calculateNextPrayer(current, days, tz)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('ashar')
      expect(result?.label).toBe('Ashar')
      expect(result?.timeStr).toBe('15:00')
      expect(result?.previousPrayerName).toBe('dzuhur')
    })

    it('menentukan sholat berikutnya sebelum Subuh (Subuh hari ini, sebelumnya Isya kemarin)', () => {
      // 24 Nov 2026 pukul 03:00 WIB
      const current = parseTimeInZone(2026, 11, 24, '03:00', tz)
      const result = calculateNextPrayer(current, days, tz)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('subuh')
      expect(result?.label).toBe('Subuh')
      expect(result?.timeStr).toBe('04:15')
      expect(result?.previousPrayerName).toBe('isya')
    })

    it('menentukan sholat berikutnya setelah Isya (Subuh besok)', () => {
      // 24 Nov 2026 pukul 20:30 WIB
      const current = parseTimeInZone(2026, 11, 24, '20:30', tz)
      const result = calculateNextPrayer(current, days, tz)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('subuh')
      expect(result?.previousPrayerName).toBe('isya')
      expect(result?.countdownText).toContain('jam')
    })

    it('menangani sholat berikutnya saat lintas bulan (hari terakhir ke tanggal 1 bulan berikutnya)', () => {
      const monthDays = [createMockDay(30, 11, 2026, tz, { Isha: '19:00' })]
      const nextMonthDays = [createMockDay(1, 12, 2026, tz, { Fajr: '04:18' })]

      // 30 Nov 2026 pukul 21:00 WIB
      const current = parseTimeInZone(2026, 11, 30, '21:00', tz)
      const result = calculateNextPrayer(current, monthDays, tz, nextMonthDays)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('subuh')
      expect(result?.timeStr).toBe('04:18')
    })
  })

  it('formatCountdown memformat selisih waktu dengan akurat', () => {
    const base = new Date('2026-11-24T12:00:00Z')
    const in30Sec = new Date(base.getTime() + 30 * 1000)
    const in45Min = new Date(base.getTime() + 45 * 60 * 1000)
    const in2Hr15Min = new Date(base.getTime() + (2 * 60 + 15) * 60 * 1000)

    expect(formatCountdown(in30Sec, base)).toBe('kurang dari 1 menit')
    expect(formatCountdown(in45Min, base)).toBe('dalam 45 menit')
    expect(formatCountdown(in2Hr15Min, base)).toBe('dalam 2 jam 15 menit')
  })

  it('calculateProgress menghasilkan persentase antara 0 dan 100', () => {
    const prev = new Date('2026-11-24T12:00:00Z')
    const next = new Date('2026-11-24T15:00:00Z') // 3 jam

    const atPrev = new Date('2026-11-24T12:00:00Z')
    const mid = new Date('2026-11-24T13:30:00Z') // 50%
    const atNext = new Date('2026-11-24T15:00:00Z')

    expect(calculateProgress(prev, next, atPrev)).toBe(0)
    expect(calculateProgress(prev, next, mid)).toBe(50)
    expect(calculateProgress(prev, next, atNext)).toBe(100)
  })
})
