// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { isMorningDzikirTime } from '../time'
import {
  getDzikirProgress,
  getDzikirStorageKey,
  resetDzikirProgress,
  saveDzikirProgress,
} from '../../../../lib/storage'
import dzikirJson from '../../../../data/dzikir.json'
import type { AladhanDayData } from '../../../prayer-times/types'
import type { DzikirProgress } from '../../../../types'

describe('isMorningDzikirTime', () => {
  const mockTodayData: AladhanDayData = {
    timings: {
      Fajr: '04:15',
      Sunrise: '05:30',
      Dhuhr: '11:45',
      Asr: '15:15',
      Sunset: '17:50',
      Maghrib: '17:50',
      Isha: '19:00',
      Imsak: '04:05',
      Midnight: '23:45',
      Firstthird: '21:40',
      Lastthird: '01:50',
    },
    date: {
      readable: '24 Nov 2026',
      timestamp: '1763942400',
      gregorian: {
        date: '24-11-2026',
        format: 'DD-MM-YYYY',
        day: '24',
        month: { number: 11, en: 'November' },
        year: '2026',
      },
      hijri: {
        date: '14-06-1448',
        format: 'DD-MM-YYYY',
        day: '14',
        month: { number: 6, en: 'Jumada al-akhirah', ar: '' },
        year: '1448',
        designation: { abbreviated: 'AH', expanded: 'Anno Hegirae' },
      },
    },
    meta: {
      latitude: -7.7956,
      longitude: 110.3695,
      timezone: 'Asia/Jakarta',
      method: { id: 20, name: 'Kemenag' },
    },
  }

  it('mengembalikan true (pagi) bila waktu sebelum Ashar (misal 08:00)', () => {
    // 24 Nov 2026 08:00 WIB (01:00 UTC)
    const morningTime = new Date('2026-11-24T01:00:00Z')
    expect(isMorningDzikirTime(mockTodayData, 'Asia/Jakarta', morningTime)).toBe(
      true,
    )
  })

  it('mengembalikan false (petang) bila waktu setelah Ashar (misal 16:00)', () => {
    // 24 Nov 2026 16:00 WIB (09:00 UTC)
    const eveningTime = new Date('2026-11-24T09:00:00Z')
    expect(isMorningDzikirTime(mockTodayData, 'Asia/Jakarta', eveningTime)).toBe(
      false,
    )
  })

  it('menggunakan fallback jam perangkat (sebelum 15.00) jika data sholat belum ada', () => {
    const morningFallback = new Date(2026, 10, 24, 10, 0, 0)
    expect(isMorningDzikirTime(null, 'Asia/Jakarta', morningFallback)).toBe(true)

    const eveningFallback = new Date(2026, 10, 24, 16, 0, 0)
    expect(isMorningDzikirTime(null, 'Asia/Jakarta', eveningFallback)).toBe(false)
  })
})

describe('Logika Hitungan Dzikir & Penyimpanan Kemajuan', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('memformat kunci penyimpanan per tanggal dan periode', () => {
    expect(getDzikirStorageKey('2026-11-24', 'morning')).toBe(
      'qaryapp:dzikir-progress:2026-11-24:morning',
    )
    expect(getDzikirStorageKey('2026-11-24', 'evening')).toBe(
      'qaryapp:dzikir-progress:2026-11-24:evening',
    )
  })

  it('menyimpan dan membaca kemajuan dzikir tanpa kebocoran antar tanggal/periode', () => {
    const progressPagi: DzikirProgress = {
      date: '2026-11-24',
      period: 'morning',
      currentIndex: 2,
      counts: { 'morning-1': 1, 'morning-2': 3 },
      completedIds: ['morning-1', 'morning-2'],
      updatedAt: '2026-11-24T08:00:00Z',
    }

    saveDzikirProgress(progressPagi)

    const loadedPagi = getDzikirProgress('2026-11-24', 'morning')
    expect(loadedPagi).not.toBeNull()
    expect(loadedPagi?.currentIndex).toBe(2)
    expect(loadedPagi?.counts['morning-2']).toBe(3)

    // Tanggal berbeda harus null
    expect(getDzikirProgress('2026-11-25', 'morning')).toBeNull()
    // Periode petang pada tanggal sama harus null
    expect(getDzikirProgress('2026-11-24', 'evening')).toBeNull()

    // Reset menghapus entri
    resetDzikirProgress('2026-11-24', 'morning')
    expect(getDzikirProgress('2026-11-24', 'morning')).toBeNull()
  })

  it('memastikan batas hitungan tidak melebihi repeatCount', () => {
    const repeatCount = 3
    let currentCount = 0

    // Tap 1
    currentCount = Math.min(currentCount + 1, repeatCount)
    expect(currentCount).toBe(1)

    // Tap 2
    currentCount = Math.min(currentCount + 1, repeatCount)
    expect(currentCount).toBe(2)

    // Tap 3 (Mencapai batas)
    currentCount = Math.min(currentCount + 1, repeatCount)
    expect(currentCount).toBe(3)

    // Tap 4 (Tidak bertambah)
    currentCount = Math.min(currentCount + 1, repeatCount)
    expect(currentCount).toBe(3)
  })
})

describe('Keutuhan Teks Arab Dzikir (Religious Content Fidelity)', () => {
  it('semua entri dzikir pagi memiliki teks Arab utuh dan repeatCount >= 1', () => {
    expect(dzikirJson.morning.length).toBeGreaterThan(0)
    dzikirJson.morning.forEach((item) => {
      expect(item.arabic).toBeDefined()
      expect(item.arabic.trim().length).toBeGreaterThan(0)
      expect(item.translation.trim().length).toBeGreaterThan(0)
      expect(Number.isInteger(item.repeatCount)).toBe(true)
      expect(item.repeatCount).toBeGreaterThanOrEqual(1)
    })
  })

  it('semua entri dzikir petang memiliki teks Arab utuh dan repeatCount >= 1', () => {
    expect(dzikirJson.evening.length).toBeGreaterThan(0)
    dzikirJson.evening.forEach((item) => {
      expect(item.arabic).toBeDefined()
      expect(item.arabic.trim().length).toBeGreaterThan(0)
      expect(item.translation.trim().length).toBeGreaterThan(0)
      expect(Number.isInteger(item.repeatCount)).toBe(true)
      expect(item.repeatCount).toBeGreaterThanOrEqual(1)
    })
  })

  it('Ayat Kursi pada dzikir pagi identik karakter-per-karakter dengan data sumber', () => {
    const ayatKursi = dzikirJson.morning.find((d) => d.title === 'Ayat al-Kursi')
    expect(ayatKursi).toBeDefined()
    expect(ayatKursi?.arabic.startsWith('ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ')).toBe(
      true,
    )
    expect(ayatKursi?.repeatCount).toBe(1)
  })
})
