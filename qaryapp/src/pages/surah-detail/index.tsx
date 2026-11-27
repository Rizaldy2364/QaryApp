import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowUp,
  Bookmark,
  ChevronDown,
  HelpCircle,
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Switch } from '../../components/ui/Switch'
import { Skeleton } from '../../components/feedback/Skeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { OfflineBanner } from '../../components/feedback/OfflineBanner'
import { DEFAULT_RECITER_NAME } from '../../features/quran/constants'
import { getSurahDetail, getSurahList } from '../../features/quran/api'
import {
  formatRevelationPlace,
  getSurahJuzLabel,
} from '../../features/quran/juz'
import {
  parseTajwidSegments,
  TAJWID_RULE_MAP,
} from '../../features/quran/tajwid'
import { TajwidLegendModal } from '../../features/quran/TajwidLegendModal'
import { useAyahPlayer } from '../../features/quran/useAyahPlayer'
import { useBookmarks } from '../../features/bookmarks/useBookmarks'
import { useSettings } from '../../features/settings/useSettings'
import { saveLastRead } from '../../lib/storage'
import { usePageTitle } from '../../lib/usePageTitle'
import NotFoundPage from '../not-found'
import { cn } from '../../lib/utils'
import type { ArabSize } from '../../types'
import type { Ayah, Surah } from '../../features/quran/types'

// ==========================================
// ITEM AYAT (Memoized untuk performa 286 ayat)
// ==========================================

interface AyahRowProps {
  ayah: Ayah
  arabSize: ArabSize
  showTranslation: boolean
  showTransliteration: boolean
  showTajwid: boolean
  isPlaying: boolean
  isBookmarked: boolean
  onTogglePlay: (ayah: Ayah) => void
  onToggleBookmark: (ayah: Ayah) => void
}

const AyahRow = React.memo(function AyahRow({
  ayah,
  arabSize,
  showTranslation,
  showTransliteration,
  showTajwid,
  isPlaying,
  isBookmarked,
  onTogglePlay,
  onToggleBookmark,
}: AyahRowProps) {
  const tajwidSegments = useMemo(
    () => (showTajwid ? parseTajwidSegments(ayah.arabicText) : null),
    [showTajwid, ayah.arabicText],
  )
  // Ukuran teks Arab sesuai preferensi pengguna
  const arabSizeClass = {
    small: 'text-2xl leading-[2.2]',
    medium: 'text-3xl leading-[2.2]',
    large: 'text-4xl leading-[2.2]',
  }[arabSize]

  return (
    <div
      id={`ayah-${ayah.number}`}
      data-ayah={ayah.number}
      className={cn(
        'scroll-mt-20 rounded-2xl border border-border bg-surface p-4 transition-colors',
        isPlaying && 'border-primary bg-primary-soft/20 ring-1 ring-primary',
      )}
    >
      {/* Bilah Aksi Ayat */}
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
        {/* Lingkaran Nomor Ayat */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-ink"
          aria-label={`Ayat nomor ${ayah.number}`}
        >
          {ayah.number}
        </div>

        {/* Tombol Audio & Bookmark */}
        <div className="flex items-center gap-1">
          <IconButton
            label={isPlaying ? `Jeda audio ayat ${ayah.number}` : `Putar audio ayat ${ayah.number}`}
            icon={
              isPlaying ? (
                <Pause className="h-4 w-4 fill-primary text-primary" />
              ) : (
                <Play className="h-4 w-4 text-text-muted hover:text-text" />
              )
            }
            onClick={() => onTogglePlay(ayah)}
            className="h-9 w-9 min-h-[44px] min-w-[44px]"
          />
          <IconButton
            label={
              isBookmarked
                ? `Hapus tanda ayat ${ayah.number}`
                : `Tandai ayat ${ayah.number}`
            }
            icon={
              <Bookmark
                className={cn(
                  'h-4 w-4 transition-colors',
                  isBookmarked
                    ? 'fill-gold text-gold'
                    : 'text-text-muted hover:text-text',
                )}
              />
            }
            onClick={() => onToggleBookmark(ayah)}
            className="h-9 w-9 min-h-[44px] min-w-[44px]"
          />
        </div>
      </div>

      {/* Teks Arab (Karakter-per-karakter persis dari API) */}
      <div
        dir="rtl"
        lang="ar"
        className={cn(
          'w-full text-right font-arab text-text',
          arabSizeClass,
        )}
      >
        {tajwidSegments
          ? tajwidSegments.map((seg, idx) =>
              seg.rule ? (
                <span key={idx} className={TAJWID_RULE_MAP[seg.rule].textClass}>
                  {seg.text}
                </span>
              ) : (
                <React.Fragment key={idx}>{seg.text}</React.Fragment>
              ),
            )
          : ayah.arabicText}
      </div>

      {/* Transliterasi Latin */}
      {showTransliteration && ayah.latinText && (
        <div className="mt-3 text-sm italic text-primary-ink/90 leading-relaxed">
          {ayah.latinText}
        </div>
      )}

      {/* Terjemahan Bahasa Indonesia */}
      {showTranslation && ayah.translationText && (
        <div className="mt-2 text-[15px] leading-relaxed text-text">
          {ayah.translationText}
        </div>
      )}
    </div>
  )
})

// ==========================================
// BOTTOM SHEET PENGATURAN BACAAN
// ==========================================

interface ReadingSettingsSheetProps {
  isOpen: boolean
  onClose: () => void
  arabSize: ArabSize
  showTranslation: boolean
  showTransliteration: boolean
  showTajwid: boolean
  onUpdateArabSize: (size: ArabSize) => void
  onUpdateTranslation: (val: boolean) => void
  onUpdateTransliteration: (val: boolean) => void
  onUpdateTajwid: (val: boolean) => void
  onOpenTajwidHelp: () => void
}

function ReadingSettingsSheet({
  isOpen,
  onClose,
  arabSize,
  showTranslation,
  showTransliteration,
  showTajwid,
  onUpdateArabSize,
  onUpdateTranslation,
  onUpdateTransliteration,
  onUpdateTajwid,
  onOpenTajwidHelp,
}: ReadingSettingsSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-settings-title"
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Latar Belakang Gelap */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel Bottom Sheet */}
      <div className="relative z-10 w-full max-w-[720px] rounded-t-2xl border-t border-border bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h2
            id="reading-settings-title"
            className="text-base font-semibold text-text"
          >
            Pengaturan Tampilan Baca
          </h2>
          <IconButton
            label="Tutup pengaturan tampilan"
            icon={<X className="h-5 w-5" />}
            onClick={onClose}
          />
        </div>

        <div className="space-y-5">
          {/* Ukuran Teks Arab */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Ukuran Huruf Arab
            </label>
            <SegmentedControl<ArabSize>
              value={arabSize}
              onChange={onUpdateArabSize}
              options={[
                { value: 'small', label: 'Kecil' },
                { value: 'medium', label: 'Sedang' },
                { value: 'large', label: 'Besar' },
              ]}
            />
          </div>

          {/* Toggle Terjemahan */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-sm font-medium text-text">
                Terjemahan Bahasa Indonesia
              </div>
              <div className="text-xs text-text-muted">
                Tampilkan arti ayat dalam bahasa Indonesia
              </div>
            </div>
            <Switch
              checked={showTranslation}
              onChange={onUpdateTranslation}
              label="Tampilkan terjemahan bahasa Indonesia"
            />
          </div>

          {/* Toggle Transliterasi */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <div className="text-sm font-medium text-text">
                Transliterasi Latin
              </div>
              <div className="text-xs text-text-muted">
                Tampilkan ejaan fonetik huruf Latin
              </div>
            </div>
            <Switch
              checked={showTransliteration}
              onChange={onUpdateTransliteration}
              label="Tampilkan transliterasi huruf Latin"
            />
          </div>

          {/* Toggle Tajwid Berwarna + Ikon Panduan Warna */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="pr-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-text">
                  Tajwid Berwarna
                </span>
                <button
                  type="button"
                  onClick={onOpenTajwidHelp}
                  aria-label="Panduan warna tajwid"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-primary-soft/50 hover:text-primary-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs text-text-muted">
                Tandai hukum bacaan dengan warna pada teks ayat
              </div>
            </div>
            <Switch
              checked={showTajwid}
              onChange={onUpdateTajwid}
              label="Aktifkan tajwid berwarna pada teks ayat"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// HALAMAN BACA SURAH
// ==========================================

export default function SurahDetailPage() {
  const navigate = useNavigate()
  const { surahNumber: paramNumber } = useParams<{ surahNumber: string }>()
  const [searchParams] = useSearchParams()
  const targetAyatParam = searchParams.get('ayat')

  const parsedSurahNumber = parseInt(paramNumber || '', 10)
  const isValidSurahNumber =
    !isNaN(parsedSurahNumber) && parsedSurahNumber >= 1 && parsedSurahNumber <= 114

  const { settings, updateSettings } = useSettings()
  const { isBookmarked, toggleBookmark } = useBookmarks()

  const [surah, setSurah] = useState<Surah | null>(null)
  const [surahList, setSurahList] = useState<Surah[]>([])
  const [activeAyat, setActiveAyat] = useState<number>(1)
  usePageTitle(surah ? surah.nameLatin : isValidSurahNumber ? `Surah ${parsedSurahNumber}` : 'Surah')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(!isValidSurahNumber)
  const [errorMessage, setErrorMessage] = useState(
    isValidSurahNumber ? '' : 'Nomor surah tidak valid (harus 1 sampai 114).',
  )
  const [isStaleCache, setIsStaleCache] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTajwidHelpOpen, setIsTajwidHelpOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAyahChange = useCallback((ayahNumber: number) => {
    const el = document.getElementById(`ayah-${ayahNumber}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const player = useAyahPlayer({
    ayahs: surah?.ayahs,
    onAyahChange: handleAyahChange,
  })

  // Muat daftar 114 surah untuk pemilih navigasi pindah surat
  useEffect(() => {
    let ignore = false
    getSurahList()
      .then((res) => {
        if (!ignore) {
          setSurahList(res.surahs)
        }
      })
      .catch(() => {
        // Abaikan jika daftar surah belum tersedia
      })
    return () => {
      ignore = true
    }
  }, [])

  // Muat detail surah
  useEffect(() => {
    if (!isValidSurahNumber) return
    let ignore = false
    getSurahDetail(parsedSurahNumber)
      .then((result) => {
        if (!ignore) {
          setSurah(result.surah)
          setActiveAyat(1)
          setIsStaleCache(result.isStale && !navigator.onLine)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setIsError(true)
          setErrorMessage(
            err instanceof Error ? err.message : 'Gagal memuat ayat surah',
          )
          setIsLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [isValidSurahNumber, parsedSurahNumber])

  const handleRetry = () => {
    if (!isValidSurahNumber) return
    setIsLoading(true)
    setIsError(false)
    getSurahDetail(parsedSurahNumber)
      .then((result) => {
        setSurah(result.surah)
        setIsStaleCache(result.isStale && !navigator.onLine)
        setIsLoading(false)
      })
      .catch((err) => {
        setIsError(true)
        setErrorMessage(
          err instanceof Error ? err.message : 'Gagal memuat ayat surah',
        )
        setIsLoading(false)
      })
  }

  // Berhenti memutar saat berpindah surah
  const stopAudio = player.stop
  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [parsedSurahNumber, stopAudio])

  // Scroll otomatis ke ?ayat=K ketika data selesai dimuat
  useEffect(() => {
    if (!isLoading && surah && targetAyatParam) {
      const targetAyat = parseInt(targetAyatParam, 10)
      if (!isNaN(targetAyat)) {
        const timeout = setTimeout(() => {
          const el = document.getElementById(`ayah-${targetAyat}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 150)
        return () => clearTimeout(timeout)
      }
    }
  }, [isLoading, surah, targetAyatParam])

  // IntersectionObserver untuk melacak "Terakhir Dibaca"
  const lastReadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manualJumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isManualJumpRef = useRef(false)
  useEffect(() => {
    if (!surah || !surah.ayahs || surah.ayahs.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length === 0) return

        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const primary = visibleEntries[0]
        const ayahNumAttr = primary.target.getAttribute('data-ayah')
        if (!ayahNumAttr) return
        const ayahNum = parseInt(ayahNumAttr, 10)
        if (isNaN(ayahNum)) return
        if (!isManualJumpRef.current) {
          setActiveAyat(ayahNum)
        }

        if (lastReadDebounceRef.current) {
          clearTimeout(lastReadDebounceRef.current)
        }

        lastReadDebounceRef.current = setTimeout(() => {
          if (!document.hidden) {
            saveLastRead(parsedSurahNumber, ayahNum)
          }
        }, 1000)
      },
      {
        root: null,
        rootMargin: '0px 0px -40% 0px',
        threshold: [0.3, 0.6],
      },
    )

    const ayahElements = document.querySelectorAll('[data-ayah]')
    ayahElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      if (lastReadDebounceRef.current) {
        clearTimeout(lastReadDebounceRef.current)
      }
    }
  }, [surah, parsedSurahNumber])

  // Handler toggle play dari row
  const toggleAudio = player.toggle
  const handleTogglePlay = useCallback(
    (ayah: Ayah) => {
      toggleAudio(ayah.number, ayah.audioUrl)
    },
    [toggleAudio],
  )

  // Handler toggle bookmark dari row
  const handleToggleBookmark = useCallback(
    async (ayah: Ayah) => {
      try {
        await toggleBookmark(parsedSurahNumber, ayah.number)
      } catch {
        // Error sudah ditangani di hook
      }
    },
    [parsedSurahNumber, toggleBookmark],
  )

  // Ayat yang sedang diputar
  const currentPlayingAyah =
    surah?.ayahs && player.playingAyahNumber !== null
      ? (surah.ayahs.find((a) => a.number === player.playingAyahNumber) ?? null)
      : null

  const handlePrevAyahAudio = () => {
    if (!surah || !surah.ayahs || player.playingAyahNumber === null) return
    const prev = surah.ayahs.find((a) => a.number === player.playingAyahNumber! - 1)
    if (prev && prev.audioUrl) {
      player.playAyah(prev.number, prev.audioUrl)
      document.getElementById(`ayah-${prev.number}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }

  const handleNextAyahAudio = () => {
    if (!surah || !surah.ayahs || player.playingAyahNumber === null) return
    const next = surah.ayahs.find((a) => a.number === player.playingAyahNumber! + 1)
    if (next && next.audioUrl) {
      player.playAyah(next.number, next.audioUrl)
      document.getElementById(`ayah-${next.number}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }

  const handleBack = () => {
    if (
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1)
    } else {
      navigate('/quran', { replace: true })
    }
  }

  const handleSelectSurah = (nextSurahNumber: number) => {
    if (nextSurahNumber !== parsedSurahNumber) {
      setIsLoading(true)
      navigate(`/quran/${nextSurahNumber}`, { replace: true })
      window.scrollTo({ top: 0 })
    }
  }

  const handleSelectAyat = (ayahNumber: number) => {
    setActiveAyat(ayahNumber)
    isManualJumpRef.current = true
    if (manualJumpTimeoutRef.current) {
      clearTimeout(manualJumpTimeoutRef.current)
    }
    manualJumpTimeoutRef.current = setTimeout(() => {
      isManualJumpRef.current = false
    }, 700)

    const el = document.getElementById(`ayah-${ayahNumber}`)
    if (el) {
      const headerOffset = 68
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }
  }

  // Apakah Bismillah harus ditampilkan sebagai header khusus di awal surah?
  // - Surah 1: Bismillah sudah merupakan ayat 1
  // - Surah 9: Tidak ada Bismillah
  // - Surah lainnya (2-8, 10-114): Tampilkan Bismillah di bagian atas sebelum ayat 1
  const showBismillahBanner = parsedSurahNumber !== 1 && parsedSurahNumber !== 9

  if (!isValidSurahNumber) {
    return <NotFoundPage />
  }

  const totalAyahsCount = surah?.totalAyahs ?? surah?.ayahs?.length ?? 0
  const arabicSurahTitle = surah
    ? surah.nameArabic.trim().startsWith('سورة')
      ? surah.nameArabic.trim()
      : `سورة ${surah.nameArabic.trim()}`
    : ''

  const isAudioBarOpen = player.playMode !== null && Boolean(surah)
  const isFullSurahMode = player.playMode === 'surah'

  return (
    <div className={cn('min-h-screen', isAudioBarOpen ? 'pb-28' : 'pb-12')}>
      {/* Header Navigasi Sticky (mengikuti scroll ke bawah) */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[720px] items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Kembali ke halaman sebelumnya"
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-text hover:bg-surface active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>

          {/* Pemilih Pindah Surat & Pindah Ayat */}
          <div className="flex flex-1 min-w-0 items-center gap-2">
            {/* Pindah Surat */}
            <div className="relative flex-1 min-w-0">
              <select
                aria-label="Pindah surat"
                value={parsedSurahNumber}
                onChange={(e) => handleSelectSurah(Number(e.target.value))}
                className="w-full h-10 min-h-[44px] appearance-none rounded-xl border border-border bg-surface pl-3 pr-8 text-xs sm:text-sm font-semibold text-text truncate focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {surahList.length > 0 ? (
                  surahList.map((item) => (
                    <option key={item.number} value={item.number}>
                      {item.number}. {item.nameLatin}
                    </option>
                  ))
                ) : (
                  <option value={parsedSurahNumber}>
                    {parsedSurahNumber}. {surah ? surah.nameLatin : `Surah ${parsedSurahNumber}`}
                  </option>
                )}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
              />
            </div>

            {/* Pindah Ayat */}
            <div className="relative w-[104px] sm:w-[116px] shrink-0">
              <select
                aria-label="Pindah ayat"
                value={activeAyat}
                disabled={totalAyahsCount === 0}
                onChange={(e) => handleSelectAyat(Number(e.target.value))}
                className="w-full h-10 min-h-[44px] appearance-none rounded-xl border border-border bg-surface pl-3 pr-7 text-xs sm:text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 cursor-pointer"
              >
                {totalAyahsCount > 0 ? (
                  Array.from({ length: totalAyahsCount }, (_, idx) => idx + 1).map((num) => (
                    <option key={num} value={num}>
                      Ayat {num}
                    </option>
                  ))
                ) : (
                  <option value={1}>Ayat 1</option>
                )}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
              />
            </div>
          </div>

          <IconButton
            label="Pengaturan tampilan membaca"
            icon={<Settings2 className="h-5 w-5" />}
            onClick={() => setIsSettingsOpen(true)}
            className="shrink-0"
          />
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 pt-3">
        {isStaleCache && (
          <div className="mb-4">
            <OfflineBanner />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-3 flex justify-between">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="mb-3 h-12 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : isError || !surah ? (
          <ErrorState
            title="Gagal Membuka Surah"
            description={errorMessage || 'Terjadi kesalahan saat memuat isi surah.'}
            onRetry={isValidSurahNumber ? handleRetry : undefined}
          />
        ) : (
          <div className="space-y-4">
            {/* Kartu Info Surah di Bawah Header Navigasi */}
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-b from-primary-soft/45 via-surface to-surface px-5 py-6 text-center">
              {/* 1. Tempat diturunkan (Makkiyyah/Madaniyyah), Juz, dan Jumlah Ayat */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-primary-ink dark:text-primary">
                <span className="rounded-full bg-primary-soft px-3 py-1">
                  {formatRevelationPlace(surah.revelationPlace)}
                </span>
                <span aria-hidden="true" className="text-text-muted">·</span>
                <span className="rounded-full bg-primary-soft px-3 py-1">
                  {getSurahJuzLabel(surah.number)}
                </span>
                <span aria-hidden="true" className="text-text-muted">·</span>
                <span className="rounded-full bg-primary-soft px-3 py-1">
                  {surah.totalAyahs} Ayat
                </span>
              </div>

              {/* 2. Tulisan سورة + Nama Surah Bahasa Arab bergaya Al-Qur'an */}
              <div
                dir="rtl"
                lang="ar"
                className="mt-4 font-arab text-3xl sm:text-4xl leading-[1.9] text-primary-ink dark:text-primary"
              >
                {arabicSurahTitle}
              </div>

              {/* 3. Nama Surah Bahasa Indonesia */}
              <h1 className="mt-1 text-xl font-bold tracking-tight text-text">
                {surah.nameLatin}
              </h1>

              {/* 4. Arti dari Surah */}
              <p className="mt-0.5 text-sm text-text-muted">
                {surah.translation}
              </p>

              {/* 5. Tombol Audio Surat Penuh */}
              {surah.audioFullUrl && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void player.toggleFullSurah(surah.audioFullUrl)}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-fg shadow-sm hover:opacity-95 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
                  >
                    {isFullSurahMode && player.isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>Jeda Audio Surat</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>
                          {isFullSurahMode && player.isLoading
                            ? 'Memuat Audio...'
                            : 'Putar 1 Surat Penuh'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </Card>

            {/* Banner Bismillah (Untuk surah selain 1 dan 9) */}
            {showBismillahBanner && (
              <Card className="my-2 border-border/80 bg-surface text-center py-6">
                <div
                  dir="rtl"
                  lang="ar"
                  className="font-arab text-2xl text-text leading-loose"
                >
                  بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                </div>
              </Card>
            )}

            {/* Daftar Ayat */}
            <div className="space-y-3">
              {surah.ayahs?.map((ayah) => (
                <AyahRow
                  key={ayah.number}
                  ayah={ayah}
                  arabSize={settings.arabSize}
                  showTranslation={settings.showTranslation}
                  showTransliteration={settings.showTransliteration}
                  showTajwid={settings.showTajwid}
                  isPlaying={player.playingAyahNumber === ayah.number}
                  isBookmarked={isBookmarked(parsedSurahNumber, ayah.number)}
                  onTogglePlay={handleTogglePlay}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sheet Pengaturan Tampilan */}
      <ReadingSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        arabSize={settings.arabSize}
        showTranslation={settings.showTranslation}
        showTransliteration={settings.showTransliteration}
        showTajwid={settings.showTajwid}
        onUpdateArabSize={(size) => updateSettings({ arabSize: size })}
        onUpdateTranslation={(val) => updateSettings({ showTranslation: val })}
        onUpdateTransliteration={(val) =>
          updateSettings({ showTransliteration: val })
        }
        onUpdateTajwid={(val) => updateSettings({ showTajwid: val })}
        onOpenTajwidHelp={() => setIsTajwidHelpOpen(true)}
      />

      {/* Bubble Panah Kembali ke Atas (di bawah header) */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Kembali ke atas"
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
        className={cn(
          'fixed top-16 left-1/2 -translate-x-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-transparent border border-primary/45 text-primary backdrop-blur-xs hover:bg-primary/10 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
          showScrollTop
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-90 -translate-y-2 pointer-events-none',
        )}
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
      </button>

      {/* Modal Panduan Warna Tajwid */}
      <TajwidLegendModal
        isOpen={isTajwidHelpOpen}
        onClose={() => setIsTajwidHelpOpen(false)}
      />

      {/* Fixed Bottom Audio Player Bar (Tinggi 84 px) */}
      {isAudioBarOpen && surah && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md shadow-2xl">
          <div className="mx-auto flex h-[84px] max-w-[720px] items-center justify-between px-4">
            {/* Info Ayat / Surat Penuh */}
            <div className="min-w-0 flex-1 pr-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 shrink-0 items-center rounded bg-primary-soft px-1.5 text-xs font-semibold text-primary-ink">
                  {isFullSurahMode ? 'Full Surat' : `Ayat ${player.playingAyahNumber}`}
                </span>
                <span className="truncate text-sm font-semibold text-text">
                  {surah.nameLatin}
                </span>
              </div>
              <div className="truncate text-xs text-text-muted mt-0.5">
                {player.error ? (
                  <span className="text-danger">{player.error}</span>
                ) : player.isLoading ? (
                  'Memuat audio...'
                ) : player.isPlaying ? (
                  isFullSurahMode ? `${DEFAULT_RECITER_NAME} · Sedang diputar` : 'Sedang diputar'
                ) : (
                  'Dijeda'
                )}
              </div>
            </div>

            {/* Kontrol Pemutar Audio */}
            <div className="flex items-center gap-1">
              {!isFullSurahMode && (
                <IconButton
                  label="Ayat sebelumnya"
                  disabled={(player.playingAyahNumber ?? 1) <= 1}
                  icon={<SkipBack className="h-4 w-4" />}
                  onClick={handlePrevAyahAudio}
                  className="h-9 w-9 min-h-[44px] min-w-[44px]"
                />
              )}
              <IconButton
                label={player.isPlaying ? 'Jeda audio' : 'Lanjutkan audio'}
                variant="primary"
                icon={
                  player.isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )
                }
                onClick={() => {
                  if (isFullSurahMode) {
                    void player.toggleFullSurah(surah.audioFullUrl)
                  } else if (currentPlayingAyah) {
                    void player.toggle(currentPlayingAyah.number, currentPlayingAyah.audioUrl)
                  }
                }}
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-full"
              />
              {!isFullSurahMode && (
                <IconButton
                  label="Ayat selanjutnya"
                  disabled={(player.playingAyahNumber ?? 1) >= (surah.totalAyahs || 1)}
                  icon={<SkipForward className="h-4 w-4" />}
                  onClick={handleNextAyahAudio}
                  className="h-9 w-9 min-h-[44px] min-w-[44px]"
                />
              )}
              <IconButton
                label="Tutup pemutar audio"
                icon={<X className="h-4 w-4 text-text-muted" />}
                onClick={() => player.stop()}
                className="h-9 w-9 min-h-[44px] min-w-[44px] ml-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
