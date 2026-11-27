import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Volume2, VolumeX } from 'lucide-react'
import { upsertNotificationEntry } from '../../lib/storage'
import { usePrayerTimes } from '../prayer-times/usePrayerTimes'
import { useSettings } from '../settings/useSettings'
import { ADZAN_AUDIO_PATH, checkAdzanAvailable } from './adzan'
import {
  findMissedPrayersSince,
  findNextPrayerTrigger,
  type ScheduledPrayerTrigger,
} from './scheduler-logic'

async function showSystemPrayerNotification(
  trigger: ScheduledPrayerTrigger,
  cityName: string,
  onClickNavigate: () => void,
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const title = `Waktu ${trigger.label}`
  const body = `Telah masuk waktu ${trigger.label} untuk wilayah ${cityName}.`

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          tag: trigger.id,
          data: { url: '/jadwal-sholat' },
        })
        return
      }
    }

    const notif = new Notification(title, {
      body,
      icon: '/icon-192.png',
      tag: trigger.id,
    })
    notif.onclick = () => {
      window.focus()
      onClickNavigate()
      notif.close()
    }
  } catch {
    // Abaikan kegagalan API notifikasi peramban
  }
}

export function ReminderScheduler() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { days, timezone } = usePrayerTimes(settings.location)

  const [isPlayingAdzan, setIsPlayingAdzan] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const lastCheckedAtRef = useRef<Date>(new Date())
  const triggeredIdsRef = useRef<Set<string>>(new Set())

  const stopAdzan = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch {
        // Abaikan jika audio belum dimuat
      }
    }
    setIsPlayingAdzan(false)
    setAutoplayBlocked(false)
  }, [])

  const playAdzan = useCallback(async () => {
    const available = await checkAdzanAvailable()
    if (!available) return

    if (!audioRef.current) {
      const audio = new Audio(ADZAN_AUDIO_PATH)
      audio.preload = 'none'
      audio.addEventListener('ended', () => {
        setIsPlayingAdzan(false)
        setAutoplayBlocked(false)
      })
      audio.addEventListener('error', () => {
        setIsPlayingAdzan(false)
        setAutoplayBlocked(false)
      })
      audioRef.current = audio
    }

    const audio = audioRef.current
    if (!audio.paused) return

    try {
      audio.currentTime = 0
      await audio.play()
      setIsPlayingAdzan(true)
      setAutoplayBlocked(false)
    } catch {
      // Kebijakan autoplay / izin audio perangkat menolak pemutaran otomatis
      setIsPlayingAdzan(false)
      setAutoplayBlocked(true)
    }
  }, [])

  // Hentikan pemutaran audio eksternal saat pengingat dimatikan
  useEffect(() => {
    if (!settings.reminders.enabled && audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch {
        // Abaikan jika audio belum dimuat
      }
    }
  }, [settings.reminders.enabled])

  const firePrayerTrigger = useCallback(
    async (trigger: ScheduledPrayerTrigger, allowSound: boolean) => {
      if (triggeredIdsRef.current.has(trigger.id)) return
      triggeredIdsRef.current.add(trigger.id)

      const cityName = settings.location?.city ?? 'wilayah Anda'
      await upsertNotificationEntry({
        id: trigger.id,
        type: 'prayer',
        title: `Waktu ${trigger.label}`,
        description: `Telah masuk waktu ${trigger.label} untuk wilayah ${cityName}.`,
        timeLabel: trigger.timeStr,
        createdAt: trigger.triggerAt.toISOString(),
        readAt: null,
        targetRoute: '/jadwal-sholat',
        ref: { prayerName: trigger.prayerName },
      })

      if (!settings.reminders.enabled) return

      await showSystemPrayerNotification(trigger, cityName, () => {
        navigate('/jadwal-sholat')
      })

      if (allowSound && settings.reminders.mode === 'notification-adzan') {
        await playAdzan()
      }
    },
    [navigate, playAdzan, settings.location?.city, settings.reminders.enabled, settings.reminders.mode],
  )

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!settings.reminders.enabled || !days || days.length === 0) {
      return
    }

    const scheduleNext = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }

      const now = new Date()
      lastCheckedAtRef.current = now
      const next = findNextPrayerTrigger(now, days, timezone)
      if (!next) return

      const delayMs = Math.max(250, Math.min(2_147_483_647, next.triggerAt.getTime() - now.getTime()))
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        void firePrayerTrigger(next, true).finally(() => {
          scheduleNext()
        })
      }, delayMs)
    }

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const now = new Date()
      const missed = findMissedPrayersSince(lastCheckedAtRef.current, now, days, timezone)
      for (const item of missed) {
        void firePrayerTrigger(item, item.isRecentWithin2Min)
      }
      scheduleNext()
    }

    scheduleNext()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [days, firePrayerTrigger, settings.reminders.enabled, timezone])

  useEffect(() => {
    return () => {
      stopAdzan()
    }
  }, [stopAdzan])

  const showPlayingBar = settings.reminders.enabled && isPlayingAdzan
  const showAutoplayBar = settings.reminders.enabled && autoplayBlocked

  if (!showPlayingBar && !showAutoplayBar) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Kontrol audio adzan"
      className="fixed top-2 inset-x-0 z-50 mx-auto max-w-md px-4"
    >
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-surface px-3.5 py-2 shadow-lg">
        {showPlayingBar ? (
          <>
            <div className="flex items-center gap-2 text-xs font-medium text-text">
              <Volume2 className="h-4 w-4 text-primary shrink-0" />
              <span>Adzan sedang diputar</span>
            </div>
            <button
              type="button"
              onClick={stopAdzan}
              aria-label="Hentikan adzan"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-danger px-3 text-xs font-medium text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger cursor-pointer"
            >
              <VolumeX className="h-4 w-4" />
              <span>Hentikan adzan</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs font-medium text-text">
              <Volume2 className="h-4 w-4 text-primary shrink-0" />
              <span>Ketuk untuk memutar adzan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void playAdzan()}
                aria-label="Putar adzan"
                className="inline-flex min-h-[44px] items-center rounded-[10px] bg-primary px-3 text-xs font-medium text-primary-fg hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                Putar
              </button>
              <button
                type="button"
                onClick={stopAdzan}
                aria-label="Tutup pemutar adzan"
                className="inline-flex min-h-[44px] items-center rounded-[10px] px-2.5 text-xs font-medium text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
