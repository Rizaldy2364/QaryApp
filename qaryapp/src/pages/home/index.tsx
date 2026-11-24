import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Compass,
  MapPin,
} from 'lucide-react'
import { useSettings } from '../../features/settings/useSettings'
import { usePrayerTimes } from '../../features/prayer-times/usePrayerTimes'
import { useGeolocation } from '../../features/location/useGeolocation'
import { getLastRead } from '../../lib/storage'
import { getSurahList } from '../../features/quran/api'
import { isMorningDzikirTime } from '../../features/dzikir/lib/time'
import { cleanPrayerTime } from '../../features/prayer-times/lib/prayer-calculations'
import { formatIndonesianHijriDate } from '../../features/prayer-times/lib/hijri-dates'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { IconButton } from '../../components/ui/IconButton'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { OfflineBanner } from '../../components/feedback/OfflineBanner'

export default function HomePage() {
  const navigate = useNavigate()
  const { settings, setLocation } = useSettings()
  const location = settings.location
  const lastRead = getLastRead()
  const [lastReadSurahName, setLastReadSurahName] = useState<string | null>(null)

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
        // Abaikan jika belum ada cache
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
      // Jika izin lokasi ditolak atau gagal, arahkan ke /lokasi dengan info
      navigate('/lokasi?geo=denied')
    }
  }

  // Format tanggal Masehi dan Hijriah di zona waktu lokasi
  const dateFormatted = useMemo(() => {
    const now = new Date()
    const masehiFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const masehiStr = masehiFormatter.format(now)

    let hijriStr = ''
    if (todayData?.date.hijri) {
      hijriStr = formatIndonesianHijriDate(todayData.date.hijri)
    }

    return {
      masehi: masehiStr,
      hijri: hijriStr,
    }
  }, [timezone, todayData])

  // Hitung apakah sekarang sebelum Ashar (waktu sholat) untuk label Dzikir
  const isBeforeAsr = useMemo(() => {
    return isMorningDzikirTime(todayData, timezone)
  }, [todayData, timezone])

  // Jadwal 6 baris: Imsak, Subuh, Dzuhur, Ashar, Maghrib, Isya
  const prayerScheduleRows = useMemo(() => {
    if (!todayData) return []
    const t = todayData.timings

    return [
      { id: 'imsak', name: 'Imsak', time: cleanPrayerTime(t.Imsak), isNext: false },
      { id: 'subuh', name: 'Subuh', time: cleanPrayerTime(t.Fajr), isNext: nextPrayer?.name === 'subuh' },
      { id: 'dzuhur', name: 'Dzuhur', time: cleanPrayerTime(t.Dhuhr), isNext: nextPrayer?.name === 'dzuhur' },
      { id: 'ashar', name: 'Ashar', time: cleanPrayerTime(t.Asr), isNext: nextPrayer?.name === 'ashar' },
      { id: 'maghrib', name: 'Maghrib', time: cleanPrayerTime(t.Maghrib), isNext: nextPrayer?.name === 'maghrib' },
      { id: 'isya', name: 'Isya', time: cleanPrayerTime(t.Isha), isNext: nextPrayer?.name === 'isya' },
    ]
  }, [todayData, nextPrayer])

  // ==========================================
  // KEADAAN: BELUM ADA LOKASI
  // ==========================================
  if (!location) {
    return (
      <div className="space-y-6 pt-6">
        <header className="flex items-center justify-between">
          <div className="h-11 w-11" />
          <h1 className="text-[22px] leading-[30px] font-semibold text-text">
            Assalamu'alaikum
          </h1>
          <div className="flex h-11 w-11 items-center justify-end">
            <Link to="/notifikasi" aria-label="Notifikasi">
              <IconButton
                label="Notifikasi"
                icon={<Bell size={20} />}
                variant="ghost"
              />
            </Link>
          </div>
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
    <div className="space-y-6">
      {/* Banner offline bila sedang offline atau memuat dari cache */}
      {(status === 'offline' || isStale) && (
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
      )}

      {/* Header Beranda */}
      <header className="flex items-center justify-between pt-2">
        <div className="h-11 w-11" />

        <div className="flex flex-col items-center text-center px-2 min-w-0">
          <p className="text-xs text-text-muted truncate">
            {dateFormatted.masehi}
            {dateFormatted.hijri ? ` • ${dateFormatted.hijri}` : ''}
          </p>
          <h1 className="text-[22px] leading-[30px] font-semibold text-text mt-0.5">
            Assalamu'alaikum
          </h1>
          <Link
            to="/lokasi"
            aria-label={`Ubah lokasi: ${location.city}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text transition-colors mt-0.5 cursor-pointer"
          >
            <span>{location.city}</span>
            <ChevronDown size={15} />
          </Link>
        </div>

        <div className="flex h-11 w-11 items-center justify-end">
          <Link to="/notifikasi" aria-label="Notifikasi">
            <IconButton
              label="Notifikasi"
              icon={<Bell size={20} />}
              variant="ghost"
            />
          </Link>
        </div>
      </header>

      {/* ==========================================
          KEADAAN: MEMUAT (SKELETON)
          ========================================== */}
      {status === 'loading' && !todayData && (
        <div className="space-y-6">
          <Card className="h-[148px] space-y-3">
            <Skeleton height={16} width="40%" />
            <Skeleton height={32} width="60%" />
            <Skeleton height={8} width="100%" />
          </Card>

          <Card className="p-4 space-y-4">
            <Skeleton height={20} width="50%" />
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height={36} width="100%" />
            ))}
          </Card>
        </div>
      )}

      {/* ==========================================
          KEADAAN: ERROR TANPA DATA CACHE
          ========================================== */}
      {status === 'error' && !todayData && (
        <Card>
          <ErrorState
            title="Jadwal Sholat Gagal Dimuat"
            description="Tidak dapat terhubung ke server Aladhan. Silakan periksa koneksi internet Anda dan coba kembali."
            onRetry={refetch}
          />
        </Card>
      )}

      {/* ==========================================
          KONTEN UTAMA JADWAL SHOLAT
          ========================================== */}
      {todayData && nextPrayer && (
        <>
          {/* Kartu Sholat Berikutnya (Tautan ke /jadwal-sholat) */}
          <Link
            to="/jadwal-sholat"
            aria-label={`Jadwal sholat lengkap. Sholat berikutnya: ${nextPrayer.label} pukul ${nextPrayer.timeStr}`}
            className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            <Card
              interactive
              className="relative overflow-hidden transition-all duration-150 group-hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      Sholat berikutnya
                    </span>
                    {isStale && <Badge variant="saved">Data tersimpan</Badge>}
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <h2 className="text-xl font-bold text-text">
                      {nextPrayer.label}
                    </h2>
                    <span className="text-2xl font-bold text-primary tabular-nums tracking-tight">
                      {nextPrayer.timeStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-text-muted group-hover:text-text transition-colors mt-1">
                  <span className="text-xs">Detail</span>
                  <ChevronRight size={16} />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>{nextPrayer.countdownText}</span>
                  <span>{nextPrayer.progress}%</span>
                </div>
                <ProgressBar
                  value={nextPrayer.progress}
                  label={`Kemajuan menuju sholat ${nextPrayer.label}`}
                />
              </div>
            </Card>
          </Link>

          {/* Daftar Jadwal 6 Waktu */}
          <Card className="p-2 overflow-hidden">
            <div className="divide-y divide-border/60">
              {prayerScheduleRows.map((row) => (
                <div
                  key={row.id}
                  className={`flex h-11 items-center justify-between px-3 rounded-lg transition-colors duration-150 ${
                    row.isNext
                      ? 'bg-primary-soft text-primary-ink font-semibold'
                      : 'text-text'
                  }`}
                >
                  <span className="text-sm font-medium">{row.name}</span>
                  <div className="flex items-center gap-2">
                    {row.isNext && <Badge variant="next">Berikutnya</Badge>}
                    <span className="text-sm tabular-nums">{row.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Kartu Terakhir Dibaca */}
      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-ink">
            <BookOpen size={20} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-text-muted">Terakhir dibaca</span>
            <p className="text-sm font-semibold text-text truncate">
              {lastRead
                ? `${lastReadSurahName || `Surah ${lastRead.surahNumber}`}, ayat ${lastRead.ayahNumber}`
                : 'Mulai membaca Al-Qur\'an'}
            </p>
          </div>
        </div>

        <Link
          to={
            lastRead
              ? `/quran/${lastRead.surahNumber}?ayat=${lastRead.ayahNumber}`
              : '/quran'
          }
        >
          <Button
            variant={status === 'error' ? 'outline' : 'primary'}
            size="md"
          >
            {lastRead ? 'Lanjutkan' : 'Mulai membaca'}
          </Button>
        </Link>
      </Card>

      {/* Pintasan Doa dan Dzikir */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/doa"
          className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        >
          <Card
            interactive
            className="flex items-center gap-3 p-3.5 group-hover:border-primary/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-ink">
              <Compass size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs text-text-muted">Kumpulan</span>
              <span className="block text-sm font-semibold text-text truncate">
                Doa Harian
              </span>
            </div>
          </Card>
        </Link>

        <Link
          to={isBeforeAsr ? '/dzikir?waktu=pagi' : '/dzikir?waktu=petang'}
          className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        >
          <Card
            interactive
            className="flex items-center gap-3 p-3.5 group-hover:border-primary/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-ink">
              <CircleDot size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs text-text-muted">Amalan</span>
              <span className="block text-sm font-semibold text-text truncate">
                {isBeforeAsr ? 'Dzikir pagi' : 'Dzikir petang'}
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
