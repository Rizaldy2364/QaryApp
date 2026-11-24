import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  MapPin,
  Check,
  BookOpen,
  Heart,
  CircleDot,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
} from 'lucide-react'
import { useSettings } from '../../features/settings/useSettings'
import { usePrayerTimes } from '../../features/prayer-times/usePrayerTimes'
import { useGeolocation } from '../../features/location/useGeolocation'
import {
  getLastRead,
  getPrayerLogs,
  markPrayer,
  unmarkPrayer,
} from '../../lib/storage'
import { getSurahList } from '../../features/quran/api'
import {
  FIVE_PRAYERS,
  cleanPrayerTime,
  parseTimeInZone,
} from '../../features/prayer-times/lib/prayer-calculations'
import { formatIndonesianHijriDate } from '../../features/prayer-times/lib/hijri-dates'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { OfflineBanner } from '../../components/feedback/OfflineBanner'
import type { PrayerName } from '../../types'

export default function HomePage() {
  const navigate = useNavigate()
  const { settings, setLocation } = useSettings()
  const location = settings.location
  const lastRead = getLastRead()
  const [lastReadSurahName, setLastReadSurahName] = useState<string | null>(null)

  // Muat nama surah terakhir dibaca
  useEffect(() => {
    if (!lastRead) return
    let isMounted = true
    getSurahList()
      .then(({ surahs }) => {
        if (!isMounted) return
        const found = surahs.find((s) => s.number === lastRead.surahNumber)
        if (found) {
          setLastReadSurahName(found.nameLatin)
        }
      })
      .catch(() => {
        // Abaikan galat luring
      })
    return () => {
      isMounted = false
    }
  }, [lastRead])

  const {
    todayData,
    nextPrayer,
    status,
    isStale,
    savedAt,
    timezone,
    refetch,
  } = usePrayerTimes(location)

  const { requestLocation, status: geoStatus } = useGeolocation()

  const handleUseLocation = async () => {
    try {
      const loc = await requestLocation()
      setLocation(loc)
    } catch {
      navigate('/lokasi?geo=denied')
    }
  }

  // Waktu real-time sekarang
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Tanggal hari ini
  const todayDateStr = useMemo(() => {
    if (todayData?.date.gregorian.date) {
      return todayData.date.gregorian.date.split('-').reverse().join('-')
    }
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [todayData])

  // Tanggal Hijriah
  const hijriStr = useMemo(() => {
    if (todayData?.date.hijri) {
      return formatIndonesianHijriDate(todayData.date.hijri)
    }
    return ''
  }, [todayData])

  // Status sholat yang telah dicatat hari ini
  const [markedPrayers, setMarkedPrayers] = useState<Set<PrayerName>>(() => new Set())

  useEffect(() => {
    let ignore = false
    getPrayerLogs(todayDateStr)
      .then((logs) => {
        if (!ignore) {
          setMarkedPrayers(new Set(logs.map((l) => l.prayer)))
        }
      })
      .catch(() => {
        // Abaikan galat baca
      })
    return () => {
      ignore = true
    }
  }, [todayDateStr])

  // Sholat yang sedang berlangsung atau paling relevan untuk ditandai:
  const targetPrayerName: PrayerName = useMemo(() => {
    if (nextPrayer?.previousPrayerName) {
      return nextPrayer.previousPrayerName
    }
    return nextPrayer?.name || 'dzuhur'
  }, [nextPrayer])

  const targetPrayerLabel = useMemo(() => {
    const map: Record<PrayerName, string> = {
      subuh: 'Subuh',
      dzuhur: 'Dzuhur',
      ashar: 'Ashar',
      maghrib: 'Maghrib',
      isya: 'Isya',
    }
    return map[targetPrayerName] || 'Dzuhur'
  }, [targetPrayerName])

  const isTargetPrayerMarked = markedPrayers.has(targetPrayerName)

  // Toggle tandai sholat target
  const handleToggleTargetPrayer = async () => {
    const isMarked = markedPrayers.has(targetPrayerName)
    setMarkedPrayers((prev) => {
      const next = new Set(prev)
      if (isMarked) next.delete(targetPrayerName)
      else next.add(targetPrayerName)
      return next
    })

    try {
      if (isMarked) {
        await unmarkPrayer(todayDateStr, targetPrayerName)
      } else {
        await markPrayer(todayDateStr, targetPrayerName)
      }
    } catch {
      // Rollback jika gagal
      setMarkedPrayers((prev) => {
        const next = new Set(prev)
        if (isMarked) next.add(targetPrayerName)
        else next.delete(targetPrayerName)
        return next
      })
    }
  }

  // Hitung countdown detik akurat ke sholat berikutnya
  const countdownText = useMemo(() => {
    if (!nextPrayer) return ''
    const diff = nextPrayer.timeObj.getTime() - currentTime.getTime()
    if (diff <= 0) return 'Telah masuk waktu sholat'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return `${hours} jam ${minutes} menit ${seconds} detik lagi`
  }, [nextPrayer, currentTime])

  // Data 5 waktu sholat dengan ikon
  const prayerTimeline = useMemo(() => {
    if (!todayData) return []
    const g = todayData.date.gregorian
    const year = Number(g.year)
    const month = Number(g.month.number)
    const day = Number(g.day)

    return FIVE_PRAYERS.map(({ key, name, label }) => {
      const rawTime = todayData.timings[key]
      const cleanTime = cleanPrayerTime(rawTime)
      const prayerDate = parseTimeInZone(year, month, day, rawTime, timezone)
      const isNext = nextPrayer?.name === name

      let Icon = Sun
      if (name === 'subuh') Icon = Sunrise
      else if (name === 'ashar') Icon = Sun
      else if (name === 'maghrib') Icon = Sunset
      else if (name === 'isya') Icon = Moon

      return {
        key,
        name,
        label,
        cleanTime,
        isNext,
        prayerDate,
        Icon,
      }
    })
  }, [todayData, timezone, nextPrayer])

  // Persentase khatam Quran (berdasarkan nomor surah atau perkiraan 114 surah)
  const quranCompletionPercent = useMemo(() => {
    if (!lastRead) return 0
    return Math.min(100, Math.max(1, Math.round((lastRead.surahNumber / 114) * 100)))
  }, [lastRead])

  // ==========================================
  // JIKA LOKASI BELUM ADA
  // ==========================================
  if (!location) {
    return (
      <div className="space-y-6 pt-6 px-4">
        <header className="flex items-center justify-between">
          <div className="h-11 w-11" />
          <h1 className="text-[22px] leading-[30px] font-semibold text-text">
            Assalamu'alaikum
          </h1>
          <div className="h-11 w-11" />
        </header>

        <Card className="text-center py-8">
          <EmptyState
            icon={<MapPin size={32} />}
            title="Belum Ada Lokasi Terpilih"
            description="Aktifkan lokasi atau pilih kota manual untuk melihat jadwal sholat akurat sesuai wilayah Anda."
            action={
              <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
                <Button
                  variant="primary"
                  fullWidth
                  loading={geoStatus === 'requesting'}
                  onClick={handleUseLocation}
                >
                  Gunakan lokasi saya
                </Button>
                <Link
                  to="/lokasi"
                  className="text-sm font-medium text-primary-ink hover:underline"
                >
                  Pilih kota manual
                </Link>
              </div>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-hidden pb-16">
      {/* Banner offline */}
      {(status === 'offline' || isStale) && (
        <div className="px-5 pt-4">
          <OfflineBanner
            lastUpdated={
              savedAt
                ? new Date(savedAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : undefined
            }
          />
        </div>
      )}

      {/* ========================================================
          BAGIAN ATAS: HEADER HIJAU JADWAL SHOLAT
          ======================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1F7A4D] via-[#176340] to-[#0B2E20] text-white pt-6 pb-14 shadow-none">
        {/* Background Siluet Masjid dan Ornamen */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 375 300"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <path
              d="M0 300V240h50v-20a25 25 0 0 1 50 0v20h30v-80l8-15 8 15v80h35v-30h40v30h154v60z"
              fill="#FFFFFF"
            />
            <circle cx="280" cy="50" r="1.5" fill="#FFFFFF" />
            <circle cx="120" cy="70" r="1.5" fill="#FFFFFF" />
            <circle cx="60" cy="40" r="1.5" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Baris Atas: Lokasi dan Tanggal Hijriah (diberi celah aman px-5 / pl-5 pr-5) */}
        <div className="relative z-10 flex items-center justify-between text-xs px-5">
          <Link
            to="/lokasi"
            className="inline-flex items-center gap-1.5 font-medium text-[#F7F5EC] hover:text-[#E0B863] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md py-1"
          >
            <MapPin className="h-3.5 w-3.5 text-[#E0B863] shrink-0" />
            <span className="truncate max-w-[180px]">{location.city}, {location.country}</span>
          </Link>
          <span className="font-medium text-[#F7F5EC]/90 shrink-0 pl-2">
            {hijriStr}
          </span>
        </div>

        {/* Busur Lingkaran & Waktu Sholat Berikutnya */}
        <div className="relative z-10 mt-6 flex flex-col items-center justify-center text-center px-4">
          {/* Badge Sholat Berikutnya */}
          <div className="mb-2">
            <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white shadow-xs">
              Mendatang: {nextPrayer?.label || 'Sholat'}
            </span>
          </div>

          {/* Busur Lingkaran SVG */}
          <div className="relative flex items-center justify-center w-64 h-36">
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 200 110"
              fill="none"
              aria-hidden="true"
            >
              {/* Busur latar belakang redup */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Busur kemajuan aksen warna emas/hijau */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                stroke="#E0B863"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * (nextPrayer?.progress || 0)) / 100}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Jam Waktu Sholat Besar */}
            <div className="flex flex-col items-center justify-center pt-2">
              <span className="font-mono text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                {nextPrayer?.timeStr || '--:--'}
              </span>
            </div>
          </div>

          {/* Teks Hitung Mundur */}
          <p className="mt-1 text-xs text-[#F7F5EC]/90 font-medium">
            {countdownText}
          </p>
        </div>

        {/* Timeline 5 Waktu Sholat Horisontal */}
        <div className="relative z-10 mt-6 grid grid-cols-5 gap-1 pt-4 border-t border-white/15 text-center px-4">
          {prayerTimeline.map((item) => {
            const isHighlight = item.isNext
            const IconComp = item.Icon

            return (
              <div
                key={item.name}
                className={`flex flex-col items-center py-1 rounded-xl transition-all ${
                  isHighlight ? 'bg-white/15 font-semibold' : 'text-white/80'
                }`}
              >
                <span className="text-[11px] mb-1">{item.label}</span>
                <IconComp className={`h-4 w-4 mb-1 ${isHighlight ? 'text-[#E0B863]' : 'text-white/70'}`} />
                <span className="font-mono text-xs">{item.cleanTime}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ========================================================
          BAGIAN BAWAH: MENYATU DENGAN HEADER + SUDUT ATAS MELENGKUNG (rounded-t-[32px])
          CARD "SUDAH SHOLAT" MENEMPEL SEPERTI LAKBAN DI ANTARA KEDUA CARD
          ======================================================== */}
      <div className="relative -mt-8 rounded-t-[32px] bg-bg px-4 pt-12 space-y-5 transition-colors shadow-none">
        {/* CARD LAKBAN: "Sudah sholat {targetPrayerLabel}?" */}
        <div className="absolute -top-7 left-4 right-4 z-20">
          <div
            onClick={handleToggleTargetPrayer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleToggleTargetPrayer()
              }
            }}
            className="flex items-center justify-between rounded-2xl bg-[#0B2E20]/80 backdrop-blur-md p-4 border border-white/25 shadow-lg transition-all hover:bg-[#0B2E20]/90 active:scale-[0.99] cursor-pointer select-none text-white"
          >
            <div>
              <h2 className="text-sm font-semibold text-white">
                Sudah sholat {targetPrayerLabel}?
              </h2>
              <p className="text-xs text-[#F7F5EC]/85 mt-0.5">
                {markedPrayers.size}/5 sholat telah tercatat hari ini
              </p>
            </div>

            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                isTargetPrayerMarked
                  ? 'border-[#E0B863] bg-[#E0B863] text-[#0B2E20]'
                  : 'border-white/60 bg-transparent text-transparent hover:border-white'
              }`}
            >
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>
        </div>

        {/* KEADAAN ERROR ATAU SKELETON BILA BELUM READY */}
        {status === 'loading' && !todayData && (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        )}

        {status === 'error' && !todayData && (
          <Card className="pt-2">
            <ErrorState
              title="Jadwal Sholat Gagal Dimuat"
              description="Tidak dapat terhubung ke server Aladhan. Silakan periksa koneksi internet Anda dan coba kembali."
              onRetry={refetch}
            />
          </Card>
        )}

        {/* 3 Kotak Pintasan Utama Bersebelahan: Al-Qur'an, Doa, dan Dzikir */}
        <section aria-label="Menu Pintasan Utama" className="pt-1">
          <div className="grid grid-cols-3 gap-3">
            {/* 1. Al-Qur'an */}
            <Link
              to="/quran"
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            >
              <Card
                interactive
                className="flex flex-col items-center justify-center p-4 text-center rounded-2xl border-border bg-surface shadow-xs transition-transform group-hover:scale-[1.02]"
              >
                <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <BookOpen className="h-6 w-6 stroke-[2]" />
                </div>
                <span className="text-xs font-semibold text-text">
                  Al-Qur'an
                </span>
              </Card>
            </Link>

            {/* 2. Doa Harian */}
            <Link
              to="/doa"
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            >
              <Card
                interactive
                className="flex flex-col items-center justify-center p-4 text-center rounded-2xl border-border bg-surface shadow-xs transition-transform group-hover:scale-[1.02]"
              >
                <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Heart className="h-6 w-6 stroke-[2]" />
                </div>
                <span className="text-xs font-semibold text-text">
                  Doa
                </span>
              </Card>
            </Link>

            {/* 3. Dzikir */}
            <Link
              to="/dzikir"
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            >
              <Card
                interactive
                className="flex flex-col items-center justify-center p-4 text-center rounded-2xl border-border bg-surface shadow-xs transition-transform group-hover:scale-[1.02]"
              >
                <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <CircleDot className="h-6 w-6 stroke-[2]" />
                </div>
                <span className="text-xs font-semibold text-text">
                  Dzikir
                </span>
              </Card>
            </Link>
          </div>
        </section>

        {/* Card: Quran Completion (Khatam Al-Qur'an / Terakhir Dibaca) */}
        <section aria-label="Kemajuan Baca Al-Qur'an">
          <Link
            to={
              lastRead
                ? `/quran/${lastRead.surahNumber}?ayat=${lastRead.ayahNumber}`
                : '/quran'
            }
            className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
          >
            <Card
              interactive
              className="relative flex items-center justify-between p-5 rounded-2xl border-border bg-surface shadow-xs group-hover:border-primary/40 transition-all"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text">
                    Kemajuan Al-Qur'an
                  </h3>
                  <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-primary transition-colors" />
                </div>

                <p className="mt-1 text-xs text-text-muted truncate">
                  {lastRead
                    ? `Terakhir dibaca: ${lastReadSurahName || `Surah ${lastRead.surahNumber}`} ayat ${lastRead.ayahNumber}`
                    : 'Mulai membaca Al-Qur\'an untuk memantau kemajuan'}
                </p>

                {/* Progress bar kemajuan baca */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${quranCompletionPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold text-text">
                    {quranCompletionPercent}%
                  </span>
                </div>
              </div>

              {/* Ilustrasi Al-Qur'an Terbuka (SVG Aksara / Buku) */}
              <div className="shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft/40 text-primary">
                <BookOpen className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
            </Card>
          </Link>
        </section>
      </div>
    </div>
  )
}
