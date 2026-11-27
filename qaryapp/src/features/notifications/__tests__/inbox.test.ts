import { describe, expect, it } from 'vitest'
import type { AladhanDayData } from '../../prayer-times/types'
import { generateInbox, groupNotificationsByDay, mergeAndPruneNotifications } from '../inbox'

function makeDay(
  year: number,
  month: number,
  day: number,
  timings: Partial<Record<'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', string>>,
): AladhanDayData {
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  return {
    timings: {
      Fajr: timings.Fajr ?? '04:30 (WIB)',
      Sunrise: timings.Sunrise ?? '05:45 (WIB)',
      Dhuhr: timings.Dhuhr ?? '11:50 (WIB)',
      Asr: timings.Asr ?? '15:10 (WIB)',
      Sunset: '17:55 (WIB)',
      Maghrib: timings.Maghrib ?? '17:55 (WIB)',
      Isha: timings.Isha ?? '19:05 (WIB)',
      Imsak: '04:20 (WIB)',
      Midnight: '23:55 (WIB)',
      Firstthird: '22:00 (WIB)',
      Lastthird: '02:00 (WIB)',
    },
    date: {
      readable: `${dd} Nov ${year}`,
      timestamp: '0',
      gregorian: {
        date: `${dd}-${mm}-${year}`,
        format: 'DD-MM-YYYY',
        day: dd,
        month: { number: month, en: 'November' },
        year: String(year),
      },
      hijri: {
        date: '15-05-1448',
        format: 'DD-MM-YYYY',
        day: '15',
        month: { number: 5, en: 'Jumada', ar: 'جمادى' },
        year: '1448',
        designation: { abbreviated: 'H', expanded: 'Hijri' },
      },
    },
    meta: {
      latitude: -6.2,
      longitude: 106.8,
      timezone: 'Asia/Jakarta',
      method: { id: 20, name: 'Kemenag' },
    },
  }
}

describe('generateInbox & notifications helpers', () => {
  it('menghasilkan entri dalam jendela 48 jam sesuai zona waktu lokasi dan tanpa duplikat', () => {
    const days = [
      makeDay(2026, 11, 23, {}), // > 48 jam sebelum 26 Nov 12:30 -> diabaikan
      makeDay(2026, 11, 25, {}), // dalam 48 jam
      makeDay(2026, 11, 26, {}), // hari ini (Subuh, Sunrise, Dzuhur sudah lewat pada 12:30 WIB)
    ]
    // 2026-11-26T05:30:00Z === 12:30 WIB (Asia/Jakarta)
    const now = new Date('2026-11-26T05:30:00.000Z')
    const surahNames = new Map<number, string>([[2, 'Al-Baqarah']])

    const { entries, todayDateStr } = generateInbox({
      now,
      days,
      timezone: 'Asia/Jakarta',
      cityName: 'Jakarta',
      lastOpenedDate: null,
      featuredVerses: [{ surah: 2, ayah: 286 }],
      surahNames,
    })

    expect(todayDateStr).toBe('2026-11-26')
    expect(entries.some((e) => e.id.includes('2026-11-23'))).toBe(false)
    expect(entries.some((e) => e.id === 'prayer:2026-11-26:subuh')).toBe(true)
    expect(entries.some((e) => e.id === 'prayer:2026-11-26:dzuhur')).toBe(true)
    expect(entries.some((e) => e.id === 'prayer:2026-11-26:ashar')).toBe(false)
    expect(entries.some((e) => e.id === 'dzikir-pagi:2026-11-26:pagi')).toBe(true)
    expect(entries.some((e) => e.id === 'renungan:2026-11-26:harian')).toBe(true)

    // Penggabungan menjaga readAt lama dan membatasi maks 50 & 30 hari
    const readEntry = {
      ...entries[0]!,
      readAt: '2026-11-26T05:00:00.000Z',
    }
    const merged = mergeAndPruneNotifications([readEntry], entries, now)
    expect(merged.find((m) => m.id === readEntry.id)?.readAt).toBe(
      '2026-11-26T05:00:00.000Z',
    )
    expect(new Set(merged.map((m) => m.id)).size).toBe(merged.length)
  })

  it('mengelompokkan entri ke Hari ini, Kemarin, dan Sebelumnya serta berurutan terbaru dulu', () => {
    const now = new Date('2026-11-26T05:30:00.000Z') // 12:30 WIB
    const grouped = groupNotificationsByDay(
      [
        {
          id: '1',
          type: 'prayer',
          title: 'Hari ini',
          description: '',
          timeLabel: '11:50',
          createdAt: '2026-11-26T04:50:00.000Z',
          readAt: null,
          targetRoute: '/jadwal-sholat',
        },
        {
          id: '2',
          type: 'prayer',
          title: 'Kemarin',
          description: '',
          timeLabel: '11:50',
          createdAt: '2026-11-25T04:50:00.000Z',
          readAt: null,
          targetRoute: '/jadwal-sholat',
        },
        {
          id: '3',
          type: 'prayer',
          title: 'Sebelumnya',
          description: '',
          timeLabel: '11:50',
          createdAt: '2026-11-24T04:50:00.000Z',
          readAt: null,
          targetRoute: '/jadwal-sholat',
        },
      ],
      now,
      'Asia/Jakarta',
    )

    expect(grouped.map((g) => g.label)).toEqual(['Hari ini', 'Kemarin', 'Sebelumnya'])
  })
})
