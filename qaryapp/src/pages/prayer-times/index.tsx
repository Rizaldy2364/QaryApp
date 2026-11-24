import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { Check, MapPin, BellOff } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/feedback/Skeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { useSettings } from '../../features/settings/useSettings'
import { usePrayerTimes } from '../../features/prayer-times/usePrayerTimes'
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
import type { PrayerName } from '../../types'

export function PrayerTimesPage() {
  usePageTitle('Jadwal Sholat')
  const { settings } = useSettings()
  const prayerTimesResult = usePrayerTimes(settings.location)
  const { todayData, nextPrayer, status, timezone, refetch } = prayerTimesResult

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

                  <span className="font-mono text-xl font-bold tracking-tight text-text">
                    {p.cleanTime}
                  </span>
                </Card>
              )
            })}
          </div>
        )}

        {/* Seksi Pengingat Sholat (Fitur Tahap 2) */}
        <section aria-label="Pengingat Sholat" className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wider">
              Pengingat Sholat
            </h2>
            <Badge variant="default">
              Segera hadir
            </Badge>
          </div>

          <Card className="flex items-center gap-3 p-4 opacity-75 bg-surface/50 border-dashed">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border/40 text-text-muted">
              <BellOff className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-text">
                Notifikasi Waktu Sholat
              </h3>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Pengaturan adzan dan pengingat akan aktif di pembaruan berikutnya setelah izin sistem web push dikonfigurasi.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
export default PrayerTimesPage
