import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Moon,
  Repeat2,
  RotateCcw,
  Sun,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Tabs } from '../../components/ui/Tabs'
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { getDzikirList } from '../../features/dzikir/api'
import { isMorningDzikirTime } from '../../features/dzikir/lib/time'
import { usePrayerTimes } from '../../features/prayer-times/usePrayerTimes'
import { useSettings } from '../../features/settings/useSettings'
import {
  getDzikirProgress,
  resetDzikirProgress,
  saveDzikirProgress,
} from '../../lib/storage'
import { usePageTitle } from '../../lib/usePageTitle'
import { cn } from '../../lib/utils'
import type { Dzikir, DzikirProgress } from '../../types'

export default function DzikirPage() {
  usePageTitle('Dzikir Pagi & Petang')
  const [searchParams, setSearchParams] = useSearchParams()
  const { settings } = useSettings()
  const { todayData, timezone } = usePrayerTimes(settings.location)

  // Tanggal hari ini dalam format YYYY-MM-DD sesuai zona waktu lokasi
  const todayDateStr = useMemo(() => {
    try {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || undefined,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      return formatter.format(now)
    } catch {
      return new Date().toISOString().split('T')[0]
    }
  }, [timezone])

  // Periode awal: parameter URL atau penentu waktu otomatis
  const initialPeriod = useMemo((): 'morning' | 'evening' => {
    const waktuParam = searchParams.get('waktu')
    if (waktuParam === 'pagi') return 'morning'
    if (waktuParam === 'petang') return 'evening'
    return isMorningDzikirTime(todayData, timezone) ? 'morning' : 'evening'
  }, [searchParams, todayData, timezone])

  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'evening'>(
    () => initialPeriod,
  )

  const [dzikirList, setDzikirList] = useState<Dzikir[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // State kemajuan dzikir
  const [currentIndex, setCurrentIndex] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [completedIds, setCompletedIds] = useState<(string | number)[]>([])
  const [isSessionFinished, setIsSessionFinished] = useState(false)
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const dzikirCardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (dzikirCardRef.current) {
      dzikirCardRef.current.scrollTop = 0
    }
  }, [currentIndex, selectedPeriod])

  // Sinkronisasi parameter URL saat tab diubah manual
  const handleTabChange = useCallback(
    (tabId: string) => {
      const period = tabId === 'morning' ? 'morning' : 'evening'
      setSelectedPeriod(period)
      setIsLoading(true)
      setIsError(false)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('waktu', period === 'morning' ? 'pagi' : 'petang')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // Muat data dzikir per periode
  useEffect(() => {
    let ignore = false

    getDzikirList(selectedPeriod)
      .then((list) => {
        if (!ignore) {
          setDzikirList(list)
          // Pulihkan progress tersimpan untuk hari ini dan periode ini
          const saved = getDzikirProgress(todayDateStr, selectedPeriod)
          if (saved) {
            setCurrentIndex(saved.currentIndex ?? 0)
            setCounts(saved.counts ?? {})
            setCompletedIds(saved.completedIds ?? [])
            setIsSessionFinished(
              saved.currentIndex >= list.length && list.length > 0,
            )
          } else {
            setCurrentIndex(0)
            setCounts({})
            setCompletedIds([])
            setIsSessionFinished(false)
          }
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setIsError(true)
          setErrorMessage(
            err instanceof Error ? err.message : 'Gagal memuat bacaan dzikir',
          )
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedPeriod, todayDateStr])

  const handleRetry = () => {
    setIsLoading(true)
    setIsError(false)
    getDzikirList(selectedPeriod)
      .then((list) => {
        setDzikirList(list)
        setIsLoading(false)
      })
      .catch((err) => {
        setIsError(true)
        setErrorMessage(
          err instanceof Error ? err.message : 'Gagal memuat bacaan dzikir',
        )
        setIsLoading(false)
      })
  }

  // Dzikir yang sedang ditampilkan
  const currentDzikir = dzikirList[currentIndex] as Dzikir | undefined
  const currentDzikirId = currentDzikir ? String(currentDzikir.id) : ''
  const currentCount = currentDzikir ? counts[currentDzikirId] ?? 0 : 0
  const isCurrentCompleted = currentDzikir
    ? currentCount >= currentDzikir.repeatCount
    : false

  // Simpan progress setiap ada perubahan
  const persistProgress = useCallback(
    (
      newIndex: number,
      newCounts: Record<string, number>,
      newCompleted: (string | number)[],
    ) => {
      const progress: DzikirProgress = {
        date: todayDateStr,
        period: selectedPeriod,
        currentIndex: newIndex,
        counts: newCounts,
        completedIds: newCompleted,
        updatedAt: new Date().toISOString(),
      }
      saveDzikirProgress(progress)
    },
    [todayDateStr, selectedPeriod],
  )

  // Tap counter tombol 96 px
  const handleCounterTap = () => {
    if (!currentDzikir || isCurrentCompleted) return

    const nextCount = currentCount + 1
    const newCounts = { ...counts, [currentDzikirId]: nextCount }
    setCounts(newCounts)

    const completed = nextCount >= currentDzikir.repeatCount
    let newCompleted = completedIds
    if (completed && !completedIds.includes(currentDzikir.id)) {
      newCompleted = [...completedIds, currentDzikir.id]
      setCompletedIds(newCompleted)
    }

    persistProgress(currentIndex, newCounts, newCompleted)

    if (completed) {
      setLiveAnnouncement(
        `Dzikir selesai dibaca ${currentDzikir.repeatCount} kali.`,
      )
    } else {
      setLiveAnnouncement(
        `Hitungan ${nextCount} dari ${currentDzikir.repeatCount}`,
      )
    }
  }

  // Tombol "Atur Ulang" (48 px)
  const handleResetCurrent = () => {
    if (!currentDzikir) return
    const newCounts = { ...counts, [currentDzikirId]: 0 }
    const newCompleted = completedIds.filter((id) => id !== currentDzikir.id)
    setCounts(newCounts)
    setCompletedIds(newCompleted)
    persistProgress(currentIndex, newCounts, newCompleted)
    setLiveAnnouncement('Hitungan dzikir diatur ulang ke 0')
  }

  // Tombol "Sebelumnya" (44 px)
  // TODO: Tombol "Sebelumnya" ini SEMENTARA (belum ada desain resmi di desain.md).
  // Kemajuan hitungan dzikir yang sudah selesai atau sedang berjalan tidak boleh hilang.
  const handlePrev = () => {
    if (currentIndex <= 0) return
    const prevIdx = currentIndex - 1
    setCurrentIndex(prevIdx)
    persistProgress(prevIdx, counts, completedIds)
    setLiveAnnouncement(`Beralih ke dzikir sebelumnya ke-${prevIdx + 1}`)
  }

  // Tombol "Berikutnya" (48 px)
  const handleNext = () => {
    if (currentIndex + 1 >= dzikirList.length) {
      // Dzikir terakhir selesai
      setIsSessionFinished(true)
      persistProgress(dzikirList.length, counts, completedIds)
      setLiveAnnouncement(
        `Seluruh rangkaian dzikir ${selectedPeriod === 'morning' ? 'pagi' : 'petang'} telah selesai.`,
      )
    } else {
      const nextIdx = currentIndex + 1
      setCurrentIndex(nextIdx)
      persistProgress(nextIdx, counts, completedIds)
      setLiveAnnouncement(`Beralih ke dzikir ke-${nextIdx + 1}`)
    }
  }

  // Ulangi dari awal saat sesi dzikir selesai
  const handleRestartSession = () => {
    resetDzikirProgress(todayDateStr, selectedPeriod)
    setCurrentIndex(0)
    setCounts({})
    setCompletedIds([])
    setIsSessionFinished(false)
    setLiveAnnouncement(
      `Dzikir ${selectedPeriod === 'morning' ? 'pagi' : 'petang'} diulang dari awal`,
    )
  }

  const arabSizeClass = {
    small: 'text-2xl leading-[2.2]',
    medium: 'text-3xl leading-[2.2]',
    large: 'text-4xl leading-[2.2]',
  }[settings.arabSize]

  return (
    <div className="h-dvh lg:h-screen flex flex-col overflow-hidden pb-20 lg:pb-6">
      {/* Area aria-live untuk pengumuman dinamis penghitung */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      {/* Header & Tabs Pagi/Petang Terpadu (Menyatu dengan background halaman) */}
      <div className="w-full shrink-0 border-b border-border bg-transparent">
        <Header title="Dzikir" showBack={false} />
        <div className="mx-auto max-w-[720px]">
          <Tabs
            tabs={[
              {
                id: 'morning',
                label: 'Dzikir Pagi',
                icon: <Sun size={18} />,
              },
              {
                id: 'evening',
                label: 'Dzikir Petang',
                icon: <Moon size={18} />,
              },
            ]}
            activeTab={selectedPeriod}
            onChange={handleTabChange}
            className="border-b-0 bg-transparent"
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[720px] flex-1 min-h-0 flex flex-col px-4 pt-3 pb-2">
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="flex justify-center pt-4">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>
          </div>
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Dzikir"
            description={errorMessage || 'Terjadi kesalahan saat memuat data dzikir.'}
            onRetry={handleRetry}
          />
        ) : dzikirList.length === 0 ? (
          <EmptyState
            icon={
              selectedPeriod === 'morning' ? (
                <Sun size={32} />
              ) : (
                <Moon size={32} />
              )
            }
            title="Dzikir Belum Tersedia"
            description={`Data dzikir ${selectedPeriod === 'morning' ? 'pagi' : 'petang'} belum tersedia.`}
          />
        ) : isSessionFinished ? (
          /* ==========================================
             KARTU PENUTUP DZIKIR SELESAI
             // TODO: Desain resmi kartu penutup dzikir menyusul, ini implementasi sementara
             ========================================== */
          <Card className="my-8 text-center py-10 px-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">
              Dzikir {selectedPeriod === 'morning' ? 'Pagi' : 'Petang'} Selesai
            </h2>
            <p className="text-sm text-text-muted max-w-[320px] mx-auto mb-6">
              Alhamdulillah, Anda telah menyelesaikan seluruh rangkaian wirid dzikir{' '}
              {selectedPeriod === 'morning' ? 'pagi' : 'petang'} untuk hari ini.
            </p>
            <div className="flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleRestartSession}
                className="min-h-[44px]"
              >
                Ulangi dari Awal
              </Button>
            </div>
          </Card>
        ) : currentDzikir ? (
          <div key={selectedPeriod} className="flex-1 min-h-0 flex flex-col gap-3 animate-tab-enter">
            {/* Indikator Progres */}
            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <IconButton
                    label="Dzikir sebelumnya"
                    icon={<ArrowLeft size={16} />}
                    disabled={currentIndex === 0}
                    onClick={handlePrev}
                    className="h-7 w-7 min-h-[40px] min-w-[40px] rounded-lg -ml-2 text-text hover:bg-primary-soft/40 disabled:opacity-30 disabled:pointer-events-none"
                  />
                  <span className="text-sm font-semibold text-text">
                    Dzikir {currentIndex + 1} dari {dzikirList.length}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted">
                  <Repeat2 size={13} className="shrink-0" />
                  Dibaca {currentDzikir.repeatCount}×
                </span>
              </div>
              <ProgressBar
                value={
                  ((currentIndex + (isCurrentCompleted ? 1 : 0)) /
                    dzikirList.length) *
                  100
                }
                label={`Kemajuan dzikir ${currentIndex + 1} dari ${dzikirList.length}`}
              />
            </div>

            {/* Kartu Bacaan Dzikir (Scroll internal saat teks panjang) */}
            <div
              ref={dzikirCardRef}
              key={currentDzikir.id}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-border/80 bg-surface p-5 shadow-sm animate-tab-enter"
            >
              {/* Judul Dzikir (Bila ada) */}
              {currentDzikir.title && (
                <h2 className="mb-2.5 text-base font-semibold leading-snug text-text">
                  {currentDzikir.title}
                </h2>
              )}

              {/* Penanda dev mode bila belum ditinjau */}
              {import.meta.env.DEV && currentDzikir.reviewStatus === 'unreviewed' && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/15 px-2.5 py-0.5 text-[11px] font-medium text-gold">
                    <Code2 size={12} className="shrink-0" />
                    Belum ditinjau · Dev
                  </span>
                </div>
              )}

              {/* Teks Arab (Rata tengah, karakter persis dari data) */}
              <div
                dir="rtl"
                lang="ar"
                className={cn(
                  'w-full py-2 text-center font-arab text-text',
                  arabSizeClass,
                )}
              >
                {currentDzikir.arabic}
              </div>

              {/* Pemisah Tipis */}
              <div className="my-4 border-b border-border/60" />

              {/* Transliterasi Latin (Bila diaktifkan) */}
              {settings.showTransliteration && currentDzikir.transliteration && (
                <div className="mb-3 text-sm italic text-primary-ink/90 leading-relaxed">
                  {currentDzikir.transliteration}
                </div>
              )}

              {/* Terjemahan Bahasa Indonesia */}
              <div>
                <div className="mb-1 text-xs font-medium text-text-muted">
                  Terjemahan
                </div>
                <p className="text-sm leading-relaxed text-text/90">
                  {currentDzikir.translation}
                </p>
              </div>

              {/* Sumber Kecil */}
              {currentDzikir.source && (
                <div className="mt-3 text-xs leading-normal text-text-muted">
                  Sumber: {currentDzikir.source}
                </div>
              )}
            </div>

            {/* ==========================================
                AREA PENGHITUNG (TERPIN DI BAWAH KARTU, TANPA KOTAK)
                Ukuran area sentuh >= 44 px, aman dari menu aktif
                ========================================== */}
            <div className="shrink-0 w-full px-2 py-1.5">
              <div className="flex items-center justify-between">
                {/* Tombol Kiri: Atur Ulang (Bulat 44 px) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label={`Atur ulang hitungan dzikir ke-${currentIndex + 1}`}
                    onClick={handleResetCurrent}
                    className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-surface text-text transition-colors hover:bg-primary-soft/30 active:bg-primary-soft/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <span className="mt-1 text-[11px] text-text-muted">Atur ulang</span>
                </div>

                {/* Tombol Tengah: Penghitung Utama (Bulat 72 px) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label={
                      isCurrentCompleted
                        ? `Dzikir ke-${currentIndex + 1} selesai dibaca`
                        : `Tambah hitungan, sekarang ${currentCount} dari ${currentDzikir.repeatCount}`
                    }
                    onClick={handleCounterTap}
                    disabled={isCurrentCompleted}
                    className={cn(
                      'flex h-[72px] w-[72px] min-h-[72px] min-w-[72px] flex-col items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 shadow-md',
                      isCurrentCompleted
                        ? 'bg-primary-soft text-primary-ink cursor-default'
                        : 'bg-primary text-primary-fg cursor-pointer hover:opacity-95',
                    )}
                  >
                    {isCurrentCompleted ? (
                      <>
                        <Check size={24} strokeWidth={2.5} />
                        <span className="text-[11px] font-semibold mt-0.5">Selesai</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold tabular-nums leading-none">
                          {currentCount}
                        </span>
                        <span className="text-[11px] font-normal opacity-90 mt-0.5">
                          dari {currentDzikir.repeatCount}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Tombol Kanan: Berikutnya (Bulat 44 px) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Pindah ke dzikir berikutnya"
                    onClick={handleNext}
                    className={cn(
                      'flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isCurrentCompleted
                        ? 'bg-primary text-primary-fg shadow-sm hover:opacity-95'
                        : 'border border-border bg-surface text-text hover:bg-primary-soft/30 active:bg-primary-soft/50',
                    )}
                  >
                    <ArrowRight size={18} />
                  </button>
                  <span className="mt-1 text-[11px] text-text-muted">Berikutnya</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
