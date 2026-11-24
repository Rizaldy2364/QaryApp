import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserLocation } from '../../types'
import { getPrayerMethodId } from '../../lib/prayer-methods'
import { getCache, setCache } from '../../lib/storage'
import { useOnlineStatus } from '../../lib/useOnlineStatus'
import { fetchMonthlyCalendar } from './api'
import {
  calculateNextPrayer,
  getCurrentDateInTimezone,
} from './lib/prayer-calculations'
import type { AladhanDayData, NextPrayerInfo } from './types'

export type PrayerTimesStatus = 'loading' | 'success' | 'error' | 'offline'

export interface PrayerTimesResult {
  days: AladhanDayData[] | null
  todayData: AladhanDayData | null
  nextPrayer: NextPrayerInfo | null
  status: PrayerTimesStatus
  isStale: boolean
  savedAt: string | null
  errorMessage: string | null
  timezone: string
  refetch: () => void
}

function getCacheKey(
  lat: number,
  lng: number,
  methodId: number | undefined,
  year: number,
  month: number,
): string {
  const methodStr = methodId !== undefined ? String(methodId) : 'auto'
  return `prayer-calendar:${lat.toFixed(2)}:${lng.toFixed(2)}:${methodStr}:${year}-${month}`
}

export function usePrayerTimes(
  location: UserLocation | null,
): PrayerTimesResult {
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()

  // Sinkronisasi waktu per menit (sejajar dengan pergantian menit)
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const scheduleNextMinute = () => {
      const current = new Date()
      const msUntilNextMinute =
        (60 - current.getSeconds()) * 1000 - current.getMilliseconds()

      timer = setTimeout(() => {
        if (!document.hidden) {
          setNow(new Date())
        }
        scheduleNextMinute()
      }, Math.max(500, msUntilNextMinute))
    }

    const handleVisibility = () => {
      if (!document.hidden) {
        setNow(new Date())
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    scheduleNextMinute()

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const coords = location?.coordinates
  const lat = coords?.latitude
  const lng = coords?.longitude
  const methodId = getPrayerMethodId(location?.country)

  // Tanggal saat ini (tahun dan bulan)
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const cacheKey = useMemo(() => {
    return lat !== undefined && lng !== undefined
      ? getCacheKey(lat, lng, methodId, currentYear, currentMonth)
      : null
  }, [lat, lng, methodId, currentYear, currentMonth])

  // Query React Query untuk kalender bulan ini dengan cache IndexedDB
  const {
    data: queryData,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'prayer-calendar',
      lat?.toFixed(2),
      lng?.toFixed(2),
      methodId,
      currentYear,
      currentMonth,
    ],
    queryFn: async ({ signal }) => {
      if (lat === undefined || lng === undefined) {
        throw new Error('Koordinat lokasi tidak tersedia.')
      }

      // 1. Coba baca data dari IndexedDB cache terlebih dahulu
      const cached = cacheKey ? await getCache<AladhanDayData[]>(cacheKey) : null

      try {
        const days = await fetchMonthlyCalendar(
          lat,
          lng,
          currentYear,
          currentMonth,
          methodId,
          signal,
        )

        // Simpan data terbaru ke IndexedDB
        if (cacheKey) {
          await setCache(cacheKey, days)
        }

        return {
          days,
          savedAt: new Date().toISOString(),
          isFromCache: false,
        }
      } catch (err) {
        // Jika jaringan gagal, gunakan cache IndexedDB bila tersedia
        if (cached && Array.isArray(cached.value)) {
          return {
            days: cached.value,
            savedAt: cached.savedAt,
            isFromCache: true,
          }
        }
        throw err
      }
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 1000 * 60 * 60 * 24, // 24 jam
    retry: 1,
  })

  // Prefetch bulan berikutnya jika sisa hari bulan ini <= 3
  useEffect(() => {
    if (lat === undefined || lng === undefined || !isOnline) return

    const nowObj = new Date()
    const year = nowObj.getFullYear()
    const month = nowObj.getMonth() + 1
    const daysInMonth = new Date(year, month, 0).getDate()
    const remainingDays = daysInMonth - nowObj.getDate()

    if (remainingDays <= 3) {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const nextCacheKey = getCacheKey(lat, lng, methodId, nextYear, nextMonth)

      // Cek apakah bulan depan sudah ada di cache
      getCache<AladhanDayData[]>(nextCacheKey).then((entry) => {
        if (!entry) {
          fetchMonthlyCalendar(lat, lng, nextYear, nextMonth, methodId)
            .then((days) => setCache(nextCacheKey, days))
            .catch(() => {})
        }
      })
    }
  }, [lat, lng, methodId, isOnline])

  const activeDays = queryData?.days ?? null
  const savedAt = queryData?.savedAt ?? null
  const isStale = Boolean(queryData?.isFromCache)

  // Deteksi zona waktu dari meta jadwal
  const timezone = useMemo(() => {
    if (activeDays && activeDays.length > 0 && activeDays[0].meta.timezone) {
      return activeDays[0].meta.timezone
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
  }, [activeDays])

  // Data jadwal hari ini
  const todayData = useMemo(() => {
    if (!activeDays || activeDays.length === 0) return null
    const { year, month, day } = getCurrentDateInTimezone(now, timezone)
    return (
      activeDays.find((d) => {
        const g = d.date.gregorian
        return (
          Number(g.year) === year &&
          Number(g.month.number) === month &&
          Number(g.day) === day
        )
      }) || null
    )
  }, [activeDays, now, timezone])

  // Hitung sholat berikutnya
  const nextPrayer = useMemo(() => {
    if (!activeDays) return null
    return calculateNextPrayer(now, activeDays, timezone)
  }, [activeDays, now, timezone])

  // Tentukan status komponen
  const status: PrayerTimesStatus = useMemo(() => {
    if (isLoading && !activeDays) return 'loading'
    if (error && !activeDays) return 'error'
    if (!isOnline && activeDays) return 'offline'
    if (!activeDays) return 'loading'
    return 'success'
  }, [isLoading, error, isOnline, activeDays])

  const handleRefetch = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [
        'prayer-calendar',
        lat?.toFixed(2),
        lng?.toFixed(2),
        methodId,
        currentYear,
        currentMonth,
      ],
    })
    refetch()
  }, [queryClient, refetch, lat, lng, methodId, currentYear, currentMonth])

  return {
    days: activeDays,
    todayData,
    nextPrayer,
    status,
    isStale,
    savedAt,
    errorMessage: error instanceof Error ? error.message : null,
    timezone,
    refetch: handleRefetch,
  }
}
