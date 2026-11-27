import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { Check, MapPin, Bell, AlertCircle, Volume2, VolumeX } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Skeleton } from '../../components/feedback/Skeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { useSettings } from '../../features/settings/useSettings'
import { usePrayerTimes } from '../../features/prayer-times/usePrayerTimes'
import {
  checkAdzanAvailable,
  startAdzanSound,
  type AdzanPlaybackHandle,
} from '../../features/notifications/adzan'
import {
  FIVE_PRAYERS,
  cleanPrayerTime,
  parseTimeInZone,
} from '../../features/prayer-times/lib/prayer-calculations'
import {
  getPrayerLogs,
  markPrayer,
  unmarkPrayer,
} from '../../lib/storage'
import { usePageTitle } from '../../lib/usePageTitle'
import type { PrayerName, ReminderMode } from '../../types'

export function PrayerTimesPage() {
  usePageTitle('Jadwal Sholat')
  const { hash } = useLocation()
  const { settings, updateSettings } = useSettings()
  const prayerTimesResult = usePrayerTimes(settings.location)
  const { todayData, nextPrayer, status, timezone, refetch } = prayerTimesResult

  const [adzanAvailable, setAdzanAvailable] = useState<boolean | null>(null)
  const [isTestingAdzan, setIsTestingAdzan] = useState(false)
  const [adzanTestError, setAdzanTestError] = useState<string | null>(null)
  const adzanPreviewRef = useRef<AdzanPlaybackHandle | null>(null)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [permissionFeedback, setPermissionFeedback] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    checkAdzanAvailable().then((available) => {
      if (!ignore) {
        setAdzanAvailable(available)
      }
    })
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    return () => {
      adzanPreviewRef.current?.stop()
      adzanPreviewRef.current = null
    }
  }, [])

  useEffect(() => {
    if (hash === '#pengingat') {
      const el = document.getElementById('pengingat')
      el?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  const handleToggleReminder = (nextEnabled: boolean) => {
    setPermissionFeedback(null)

    if (!nextEnabled) {
      setShowPermissionPrompt(false)
      updateSettings({
        reminders: { ...settings.reminders, enabled: false },
      })
      return
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionFeedback(
        'Peramban ini tidak mendukung notifikasi sistem. Anda tetap dapat melihat riwayat pengingat di halaman Notifikasi.',
      )
      return
    }

    if (Notification.permission === 'granted') {
      setShowPermissionPrompt(false)
      updateSettings({
        reminders: { ...settings.reminders, enabled: true },
      })
      return
    }

    if (Notification.permission === 'denied') {
      setShowPermissionPrompt(false)
      setPermissionFeedback(
        'Izin notifikasi diblokir. Aktifkan melalui ikon gembok atau pengaturan situs pada bilah alamat peramban Anda, lalu coba lagi.',
      )
      return
    }

    // Tampilkan penjelasan singkat sebelum meminta izin notifikasi dari aksi pengguna
    setShowPermissionPrompt(true)
  }

  const handleRequestNotificationPermission = async () => {
    try {
      const result = await Notification.requestPermission()
      setShowPermissionPrompt(false)
      if (result === 'granted') {
        setPermissionFeedback(null)
        updateSettings({
          reminders: { ...settings.reminders, enabled: true },
        })
      } else {
        setPermissionFeedback(
          'Izin notifikasi tidak diberikan. Untuk mengaktifkannya nanti, buka pengaturan izin situs di peramban Anda.',
        )
        updateSettings({
          reminders: { ...settings.reminders, enabled: false },
        })
      }
    } catch {
      setShowPermissionPrompt(false)
      setPermissionFeedback('Gagal meminta izin notifikasi dari peramban.')
    }
  }

  const handleModeChange = (nextMode: string) => {
    updateSettings({
      reminders: {
        ...settings.reminders,
        mode: nextMode as ReminderMode,
      },
    })
  }

  const handleTogglePrayerAdzan = (prayer: PrayerName) => {
    const currentMap = settings.reminders.adzanPrayers
    const nextVal = !(currentMap?.[prayer] ?? true)
    updateSettings({
      reminders: {
        ...settings.reminders,
        mode: nextVal ? 'notification-adzan' : settings.reminders.mode,
        adzanPrayers: {
          ...currentMap,
          [prayer]: nextVal,
        },
      },
    })
  }

  const handleToggleTestAdzan = async () => {
    setAdzanTestError(null)
    if (isTestingAdzan && adzanPreviewRef.current) {
      adzanPreviewRef.current.stop()
      adzanPreviewRef.current = null
      setIsTestingAdzan(false)
      return
    }
    try {
      const handle = await startAdzanSound(() => {
        adzanPreviewRef.current = null
        setIsTestingAdzan(false)
      })
      adzanPreviewRef.current = handle
      setIsTestingAdzan(true)
    } catch {
      setIsTestingAdzan(false)
      setAdzanTestError('Peramban tidak dapat memutar suara adzan pada perangkat ini.')
    }
  }

  // Hari dan tanggal sekarang
  const [currentDate] = useState(() => new Date())
  const todayDateStr = useMemo(() => {
    if (todayData?.date.gregorian.date) {
      return todayData.date.gregorian.date.split('-').reverse().join('-')
    }
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
  }, [todayData, currentDate])

  // Format tanggal bahasa Indonesia untuk subjudul (cth: "Senin, 24 November 2026")
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: timezone || 'Asia/Jakarta',
    }).format(currentDate)
  }, [currentDate, timezone])

  const [markedPrayers, setMarkedPrayers] = useState<Set<PrayerName>>(() => new Set())
  const [loadingLogs, setLoadingLogs] = useState(true)

  // Muat status catatan sholat untuk hari ini
  useEffect(() => {
    let ignore = false
    getPrayerLogs(todayDateStr)
      .then((logs) => {
        if (!ignore) {
          setMarkedPrayers(new Set(logs.map((l) => l.prayer)))
          setLoadingLogs(false)
        }
      })
      .catch(() => {
        if (!ignore) setLoadingLogs(false)
      })
    return () => {
      ignore = true
    }
  }, [todayDateStr])

  // Toggle checklist sholat
  const handleTogglePrayer = async (prayer: PrayerName, isPassed: boolean) => {
    if (!isPassed) return

    const isMarked = markedPrayers.has(prayer)
    // Optimistic update
    setMarkedPrayers((prev) => {
      const next = new Set(prev)
      if (isMarked) next.delete(prayer)
      else next.add(prayer)
      return next
    })

    try {
      if (isMarked) {
        await unmarkPrayer(todayDateStr, prayer)
      } else {
        await markPrayer(todayDateStr, prayer)
      }
    } catch {
      // Rollback jika gagal
      setMarkedPrayers((prev) => {
        const next = new Set(prev)
        if (isMarked) next.add(prayer)
        else next.delete(prayer)
        return next
      })
    }
  }

  // Hitung apakah masing-masing waktu sholat sudah tiba
  const prayerRows = useMemo(() => {
    if (!todayData) return []

    const g = todayData.date.gregorian
    const year = Number(g.year)
    const month = Number(g.month.number)
    const day = Number(g.day)

    return FIVE_PRAYERS.map(({ key, name, label }) => {
      const rawTime = todayData.timings[key]
      const cleanTime = cleanPrayerTime(rawTime)
      const prayerDate = parseTimeInZone(year, month, day, rawTime, timezone)
      const isPassed = currentDate.getTime() >= prayerDate.getTime()
      const isNext = nextPrayer?.name === name
      const isMarked = markedPrayers.has(name)

      return {
        key,
        name,
        label,
        cleanTime,
        isPassed,
        isNext,
        isMarked,
      }
    })
  }, [todayData, timezone, currentDate, nextPrayer, markedPrayers])

  const cityName = settings.location?.city || 'Jakarta'

  return (
    <div className="pb-16">
      <Header
        title="Jadwal Sholat"
        showBack={true}
      />

      <div className="mx-auto max-w-[720px] px-4 pt-3">
        {/* Subheader tanggal dan lokasi */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <p className="text-sm font-medium text-text">
            {formattedDate}
          </p>
          <Link
            to="/lokasi"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 py-0.5"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>{cityName}</span>
          </Link>
        </div>

        {/* Konten Jadwal */}
        {status === 'loading' || loadingLogs ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : status === 'error' && !todayData ? (
          <ErrorState
            title="Gagal memuat jadwal sholat"
            description="Terjadi gangguan saat mengambil data jadwal dari server. Silakan coba lagi."
            onRetry={refetch}
          />
        ) : (
          <div className="space-y-3">
            {prayerRows.map((p) => {
              const rowBg = p.isNext
                ? 'bg-primary-soft/40 border-primary'
                : 'bg-surface border-border'

              return (
                <Card
                  key={p.name}
                  className={`flex items-center justify-between p-4 transition-all ${rowBg}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={
                        p.isMarked
                          ? `Batalkan tanda sholat ${p.label}`
                          : p.isPassed
                            ? `Tandai sudah sholat ${p.label}`
                            : `Belum masuk waktu sholat ${p.label}`
                      }
                      aria-disabled={!p.isPassed}
                      disabled={!p.isPassed}
                      onClick={() => handleTogglePrayer(p.name, p.isPassed)}
                      className={`flex h-7 w-7 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        p.isMarked
                          ? 'text-primary'
                          : p.isPassed
                            ? 'text-text-muted hover:text-primary cursor-pointer'
                            : 'text-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                          p.isMarked
                            ? 'border-primary bg-primary text-primary-fg'
                            : p.isPassed
                              ? 'border-text-muted/60 bg-transparent hover:border-primary'
                              : 'border-border bg-border/20'
                        }`}
                      >
                        {p.isMarked && <Check className="h-4 w-4 stroke-[3]" />}
                      </div>
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-text">
                          {p.label}
                        </span>
                        {p.isNext && (
                          <Badge variant="next">
                            Berikutnya
                          </Badge>
                        )}
                      </div>
                      {!p.isPassed && (
                        <p className="text-[11px] text-text-muted">
                          Belum masuk waktu
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePrayerAdzan(p.name)}
                      aria-pressed={
                        settings.reminders.mode === 'notification-adzan' &&
                        (settings.reminders.adzanPrayers?.[p.name] ?? true)
                      }
                      aria-label={
                        settings.reminders.mode === 'notification-adzan' &&
                        (settings.reminders.adzanPrayers?.[p.name] ?? true)
                          ? `Nonaktifkan suara adzan ${p.label}`
                          : `Aktifkan suara adzan ${p.label}`
                      }
                      title={
                        settings.reminders.mode === 'notification-adzan' &&
                        (settings.reminders.adzanPrayers?.[p.name] ?? true)
                          ? `Suara adzan ${p.label} aktif`
                          : `Suara adzan ${p.label} nonaktif`
                      }
                      className={`flex h-9 w-9 min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        settings.reminders.mode === 'notification-adzan' &&
                        (settings.reminders.adzanPrayers?.[p.name] ?? true)
                          ? 'bg-primary-soft text-primary-ink'
                          : 'text-text-muted/60 hover:bg-surface-elevated hover:text-text'
                      }`}
                    >
                      {settings.reminders.mode === 'notification-adzan' &&
                      (settings.reminders.adzanPrayers?.[p.name] ?? true) ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </button>
                    <span className="font-mono text-xl font-bold tracking-tight text-text">
                      {p.cleanTime}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Seksi Pengingat Sholat */}
        <section id="pengingat" aria-label="Pengingat Sholat" className="mt-8 scroll-mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wider">
              Pengingat Sholat
            </h2>
          </div>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-text">
                    Pengingat Waktu Sholat
                  </span>
                  <span className="block text-xs text-text-muted">
                    {settings.reminders.enabled ? 'Aktif saat aplikasi terbuka' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              <Switch
                id="reminder-switch"
                label="Aktifkan pengingat waktu sholat"
                checked={settings.reminders.enabled}
                onChange={handleToggleReminder}
              />
            </div>

            {showPermissionPrompt && (
              <div className="rounded-xl border border-primary/25 bg-primary-soft p-3.5 space-y-3">
                <p className="text-xs leading-relaxed text-text">
                  QaryApp memerlukan izin notifikasi peramban agar dapat menampilkan pengingat tepat
                  saat masuk waktu sholat ketika aplikasi sedang terbuka.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPermissionPrompt(false)}
                    className="flex-1"
                  >
                    Nanti saja
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void handleRequestNotificationPermission()}
                    className="flex-1"
                  >
                    Izinkan Notifikasi
                  </Button>
                </div>
              </div>
            )}

            {permissionFeedback && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-xs text-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{permissionFeedback}</span>
              </div>
            )}
          </Card>

          <div
            aria-hidden={!settings.reminders.enabled}
            className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
              settings.reminders.enabled
                ? 'grid-rows-[1fr] opacity-100 translate-y-0'
                : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <Card className="p-4 space-y-3">
                <div className="space-y-2.5">
                  <span className="block text-xs font-medium text-text">Mode pengingat</span>
                  <SegmentedControl
                    options={[
                      { value: 'notification', label: 'Notifikasi saja' },
                      { value: 'notification-adzan', label: 'Notifikasi + Adzan' },
                    ]}
                    value={settings.reminders.mode}
                    onChange={handleModeChange}
                  />
                  {settings.reminders.mode === 'notification-adzan' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-xs text-text-muted">
                        {adzanAvailable
                          ? 'Menggunakan audio adzan (/audio/adzan.mp3). Ketuk ikon speaker pada tiap waktu sholat untuk memilih.'
                          : 'Menggunakan nada pengingat adzan bawaan. Ketuk ikon speaker pada tiap waktu sholat untuk memilih.'}
                      </p>
                      <Button
                        variant="outline"
                        tabIndex={settings.reminders.enabled ? 0 : -1}
                        onClick={() => void handleToggleTestAdzan()}
                        className="h-9 px-3 text-xs"
                      >
                        {isTestingAdzan ? 'Hentikan suara' : 'Uji suara adzan'}
                      </Button>
                    </div>
                  )}
                  {adzanTestError && (
                    <p role="alert" className="text-xs text-danger">
                      {adzanTestError}
                    </p>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-text-muted pt-1 border-t border-border/60">
                  Pengingat hanya berbunyi saat QaryApp sedang terbuka. Untuk pengingat saat aplikasi
                  tertutup, tunggu versi aplikasi Android.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
export default PrayerTimesPage
