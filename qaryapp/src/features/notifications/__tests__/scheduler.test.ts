import { describe, expect, it, vi } from 'vitest'
import type { AladhanDayData } from '../../prayer-times/types'
import { findMissedPrayersSince, findNextPrayerTrigger } from '../scheduler-logic'

function makeSampleDay(): AladhanDayData {
  return {
    timings: {
      Fajr: '04:30',
      Sunrise: '05:45',
      Dhuhr: '11:50',
      Asr: '15:10',
      Sunset: '17:55',
      Maghrib: '17:55',
      Isha: '19:05',
      Imsak: '04:20',
      Midnight: '23:55',
      Firstthird: '22:00',
      Lastthird: '02:00',
    },
    date: {
      readable: '26 Nov 2026',
      timestamp: '0',
      gregorian: {
        date: '26-11-2026',
        format: 'DD-MM-YYYY',
        day: '26',
        month: { number: 11, en: 'November' },
        year: '2026',
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

describe('scheduler-logic & aturan izin notifikasi', () => {
  it('menemukan waktu sholat berikutnya pada zona waktu lokasi', () => {
    const day = makeSampleDay()
    // 11:45 WIB = 04:45 UTC -> berikutnya adalah Dzuhur 11:50 WIB
    const now = new Date('2026-11-26T04:45:00.000Z')
    const next = findNextPrayerTrigger(now, [day], 'Asia/Jakarta')

    expect(next?.prayerName).toBe('dzuhur')
    expect(next?.timeStr).toBe('11:50')
  })

  it('mendeteksi sholat terlewat saat tab kembali terlihat dan membedakan batas 2 menit untuk suara', () => {
    const day = makeSampleDay()
    const lastChecked = new Date('2026-11-26T04:40:00.000Z') // 11:40 WIB
    const now = new Date('2026-11-26T08:11:00.000Z') // 15:11 WIB (Dzuhur lewat >2m, Ashar lewat 1m)

    const missed = findMissedPrayersSince(lastChecked, now, [day], 'Asia/Jakarta')
    expect(missed).toHaveLength(2)
    expect(missed[0]?.prayerName).toBe('dzuhur')
    expect(missed[0]?.isRecentWithin2Min).toBe(false)
    expect(missed[1]?.prayerName).toBe('ashar')
    expect(missed[1]?.isRecentWithin2Min).toBe(true)
  })

  it('tidak pernah memanggil Notification.requestPermission tanpa aksi pengguna', () => {
    const requestSpy = vi.fn()
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: requestSpy,
    })

    const day = makeSampleDay()
    findNextPrayerTrigger(new Date('2026-11-26T04:45:00.000Z'), [day], 'Asia/Jakarta')
    expect(requestSpy).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
