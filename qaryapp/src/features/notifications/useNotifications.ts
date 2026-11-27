import { useCallback, useEffect, useMemo, useState } from 'react'
import featuredData from '../../data/featured.json'
import {
  getCache,
  getLastNotificationOpenedDate,
  getStoredNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_CHANGE_EVENT,
  replaceStoredNotifications,
  setLastNotificationOpenedDate,
} from '../../lib/storage'
import type { NotificationEntry } from '../../types'
import { usePrayerTimes } from '../prayer-times/usePrayerTimes'
import { mapRawSurahListItemToDomain } from '../quran/api'
import type { EQuranSurahListItem } from '../quran/types'
import { useSettings } from '../settings/useSettings'
import { generateInbox, mergeAndPruneNotifications } from './inbox'

const FALLBACK_FEATURED_SURAH_NAMES: Record<number, string> = {
  2: 'Al-Baqarah',
  3: "Ali 'Imran",
  13: "Ar-Ra'd",
  94: 'Asy-Syarh',
}

export function useNotifications() {
  const { settings } = useSettings()
  const { days, timezone } = usePrayerTimes(settings.location)
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadFromStorage = useCallback(async () => {
    const stored = await getStoredNotifications()
    setNotifications(stored)
    setIsLoading(false)
  }, [])

  // Muat awal + dengarkan pembaruan dari ReminderScheduler atau aksi baca
  useEffect(() => {
    let ignore = false
    getStoredNotifications().then((stored) => {
      if (!ignore) {
        setNotifications(stored)
        setIsLoading(false)
      }
    })

    const handleChange = () => {
      void loadFromStorage()
    }
    window.addEventListener(NOTIFICATIONS_CHANGE_EVENT, handleChange)
    return () => {
      ignore = true
      window.removeEventListener(NOTIFICATIONS_CHANGE_EVENT, handleChange)
    }
  }, [loadFromStorage])

  // Sinkronkan kotak masuk deterministik saat jadwal atau lokasi siap
  useEffect(() => {
    if (!days || days.length === 0 || !settings.location) return

    let cancelled = false
    const syncInbox = async () => {
      const now = new Date()
      const surahNames = new Map<number, string>()
      for (const [num, name] of Object.entries(FALLBACK_FEATURED_SURAH_NAMES)) {
        surahNames.set(Number(num), name)
      }

      const cachedSurahs = await getCache<EQuranSurahListItem[]>('quran:surah-list')
      if (cachedSurahs?.value) {
        for (const raw of cachedSurahs.value) {
          const mapped = mapRawSurahListItemToDomain(raw)
          surahNames.set(mapped.number, mapped.nameLatin)
        }
      }

      const lastOpenedDate = getLastNotificationOpenedDate()
      const { entries: generated, todayDateStr } = generateInbox({
        now,
        days,
        timezone,
        cityName: settings.location!.city,
        lastOpenedDate,
        featuredVerses: featuredData.verses,
        surahNames,
      })

      const existing = await getStoredNotifications()
      const merged = mergeAndPruneNotifications(existing, generated, now)

      if (lastOpenedDate !== todayDateStr) {
        setLastNotificationOpenedDate(todayDateStr)
      }

      const hasChanged =
        merged.length !== existing.length ||
        merged.some((item, idx) => item.id !== existing[idx]?.id)

      if (hasChanged) {
        await replaceStoredNotifications(merged)
      } else if (!cancelled) {
        setNotifications(merged)
      }
    }

    void syncInbox()
    return () => {
      cancelled = true
    }
  }, [days, settings.location, timezone])

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.readAt === null).length,
    [notifications],
  )

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllNotificationsRead()
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    timezone,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: loadFromStorage,
  }
}
