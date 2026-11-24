import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useParams, useSearchParams } from 'react-router'
import {
  Bookmark,
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Switch } from '../../components/ui/Switch'
import { Skeleton } from '../../components/feedback/Skeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { OfflineBanner } from '../../components/feedback/OfflineBanner'
import { getSurahDetail } from '../../features/quran/api'
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
  isPlaying,
  isBookmarked,
  onTogglePlay,
  onToggleBookmark,
}: AyahRowProps) {
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
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '180px',
      }}
      className={cn(
        'rounded-2xl border border-border bg-surface p-4 transition-colors',
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
        {ayah.arabicText}
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
  onUpdateArabSize: (size: ArabSize) => void
  onUpdateTranslation: (val: boolean) => void
  onUpdateTransliteration: (val: boolean) => void
}

function ReadingSettingsSheet({
  isOpen,
  onClose,
  arabSize,
  showTranslation,
  showTransliteration,
  onUpdateArabSize,
  onUpdateTranslation,
  onUpdateTransliteration,
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
        </div>
      </div>
    </div>
  )
}

// ==========================================
// HALAMAN BACA SURAH
// ==========================================

export default function SurahDetailPage() {
  const { surahNumber: paramNumber } = useParams<{ surahNumber: string }>()
  const [searchParams] = useSearchParams()
  const targetAyatParam = searchParams.get('ayat')

  const parsedSurahNumber = parseInt(paramNumber || '', 10)
  const isValidSurahNumber =
    !isNaN(parsedSurahNumber) && parsedSurahNumber >= 1 && parsedSurahNumber <= 114

  const { settings, updateSettings } = useSettings()
  const { isBookmarked, toggleBookmark } = useBookmarks()

  const [surah, setSurah] = useState<Surah | null>(null)
  usePageTitle(surah ? surah.nameLatin : isValidSurahNumber ? `Surah ${parsedSurahNumber}` : 'Surah')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(!isValidSurahNumber)
  const [errorMessage, setErrorMessage] = useState(
    isValidSurahNumber ? '' : 'Nomor surah tidak valid (harus 1 sampai 114).',
  )
  const [isStaleCache, setIsStaleCache] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleAyahChange = useCallback((ayahNumber: number) => {
    const el = document.getElementById(`ayah-${ayahNumber}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const player = useAyahPlayer({
    ayahs: surah?.ayahs,
    onAyahChange: handleAyahChange,
  })

  // Muat detail surah
  useEffect(() => {
    if (!isValidSurahNumber) return
    let ignore = false
    getSurahDetail(parsedSurahNumber)
      .then((result) => {
        if (!ignore) {
          setSurah(result.surah)
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
  useEffect(() => {
    return () => {
      player.stop()
    }
  }, [parsedSurahNumber, player])

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
  const handleTogglePlay = useCallback(
    (ayah: Ayah) => {
      player.toggle(ayah.number, ayah.audioUrl)
    },
    [player],
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

  // Apakah Bismillah harus ditampilkan sebagai header khusus di awal surah?
  // - Surah 1: Bismillah sudah merupakan ayat 1
  // - Surah 9: Tidak ada Bismillah
  // - Surah lainnya (2-8, 10-114): Tampilkan Bismillah di bagian atas sebelum ayat 1
  const showBismillahBanner = parsedSurahNumber !== 1 && parsedSurahNumber !== 9

  if (!isValidSurahNumber) {
    return <NotFoundPage />
  }

  return (
    <div className={cn('min-h-screen', player.playingAyahNumber ? 'pb-28' : 'pb-12')}>
      <Header
        title={surah ? surah.nameLatin : `Surah ${parsedSurahNumber}`}
        subtitle={
          surah
            ? `${surah.translation} · ${surah.totalAyahs} ayat · ${surah.revelationPlace}`
            : undefined
        }
        showBack={true}
        rightAction={
          <IconButton
            label="Pengaturan tampilan membaca"
            icon={<Settings2 className="h-5 w-5" />}
            onClick={() => setIsSettingsOpen(true)}
          />
        }
      />

      <main className="mx-auto max-w-[720px] px-4 pt-3">
        {isStaleCache && (
          <div className="mb-4">
            <OfflineBanner />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-full rounded-2xl" />
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
        onUpdateArabSize={(size) => updateSettings({ arabSize: size })}
        onUpdateTranslation={(val) => updateSettings({ showTranslation: val })}
        onUpdateTransliteration={(val) =>
          updateSettings({ showTransliteration: val })
        }
      />

      {/* Fixed Bottom Audio Player Bar (Tinggi 84 px) */}
      {player.playingAyahNumber !== null && surah && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md shadow-2xl">
          <div className="mx-auto flex h-[84px] max-w-[720px] items-center justify-between px-4">
            {/* Info Ayat */}
            <div className="min-w-0 flex-1 pr-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 items-center rounded bg-primary-soft px-1.5 text-xs font-semibold text-primary-ink">
                  Ayat {player.playingAyahNumber}
                </span>
                <span className="truncate text-sm font-semibold text-text">
                  {surah.nameLatin}
                </span>
              </div>
              <div className="truncate text-xs text-text-muted mt-0.5">
                {player.isLoading
                  ? 'Memuat audio...'
                  : player.isPlaying
                    ? 'Sedang diputar'
                    : 'Dijeda'}
              </div>
            </div>

            {/* Kontrol Pemutar Audio */}
            <div className="flex items-center gap-1">
              <IconButton
                label="Ayat sebelumnya"
                disabled={player.playingAyahNumber <= 1}
                icon={<SkipBack className="h-4 w-4" />}
                onClick={handlePrevAyahAudio}
                className="h-9 w-9 min-h-[44px] min-w-[44px]"
              />
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
                  if (currentPlayingAyah) {
                    player.toggle(currentPlayingAyah.number, currentPlayingAyah.audioUrl)
                  }
                }}
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-full"
              />
              <IconButton
                label="Ayat selanjutnya"
                disabled={player.playingAyahNumber >= (surah.totalAyahs || 1)}
                icon={<SkipForward className="h-4 w-4" />}
                onClick={handleNextAyahAudio}
                className="h-9 w-9 min-h-[44px] min-w-[44px]"
              />
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
