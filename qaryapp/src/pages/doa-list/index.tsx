import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CloudSun,
  Droplets,
  Heart,
  Home,
  Landmark,
  Moon,
  Plane,
  Search,
  Shield,
  Shirt,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { SearchField } from '../../components/ui/SearchField'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { loadDoaData } from '../../features/doa/api'
import { useDoaFavorites } from '../../features/doa/useDoaFavorites'
import { useSettings } from '../../features/settings/useSettings'
import { usePageTitle } from '../../lib/usePageTitle'
import { cn } from '../../lib/utils'
import type { Doa, DoaCategory } from '../../types'

const CATEGORY_ICON_MAP: Record<string, ReactNode> = {
  tidur: <Moon className="h-5 w-5" />,
  'kamar-mandi': <Droplets className="h-5 w-5" />,
  'makan-minum': <Utensils className="h-5 w-5" />,
  'wudhu-shalat': <Sparkles className="h-5 w-5" />,
  rumah: <Home className="h-5 w-5" />,
  masjid: <Landmark className="h-5 w-5" />,
  pakaian: <Shirt className="h-5 w-5" />,
  perjalanan: <Plane className="h-5 w-5" />,
  alam: <CloudSun className="h-5 w-5" />,
  'akhlak-sosial': <Users className="h-5 w-5" />,
  'perlindungan-kesulitan': <Shield className="h-5 w-5" />,
}

function getCategoryIcon(categoryId: string): ReactNode {
  return CATEGORY_ICON_MAP[categoryId] ?? <BookOpen className="h-5 w-5" />
}

export default function DoaListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCategoryId = searchParams.get('kategori')

  const { settings } = useSettings()
  const { isFavorite, toggleFavorite, feedbackMessage } = useDoaFavorites()

  const [categories, setCategories] = useState<DoaCategory[]>([])
  const [doaList, setDoaList] = useState<Doa[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDoaIndexOpen, setIsDoaIndexOpen] = useState(false)
  const doaIndexRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isDoaIndexOpen) return
    const handlePointerDown = (e: PointerEvent) => {
      if (doaIndexRef.current && !doaIndexRef.current.contains(e.target as Node)) {
        setIsDoaIndexOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDoaIndexOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDoaIndexOpen])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  usePageTitle(activeCategory ? `Doa ${activeCategory.name}` : 'Doa Harian')

  useEffect(() => {
    let ignore = false
    loadDoaData()
      .then((data) => {
        if (!ignore) {
          setCategories(data.categories)
          setDoaList(data.doa)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setIsError(true)
          setErrorMessage(
            err instanceof Error ? err.message : 'Gagal memuat kumpulan doa',
          )
          setIsLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  const handleRetry = () => {
    setIsLoading(true)
    setIsError(false)
    loadDoaData()
      .then((data) => {
        setCategories(data.categories)
        setDoaList(data.doa)
        setIsLoading(false)
      })
      .catch((err) => {
        setIsError(true)
        setErrorMessage(
          err instanceof Error ? err.message : 'Gagal memuat kumpulan doa',
        )
        setIsLoading(false)
      })
  }

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    doaList.forEach((d) => {
      counts.set(d.categoryId, (counts.get(d.categoryId) ?? 0) + 1)
    })
    return counts
  }, [doaList])

  const categoryDoaList = useMemo(() => {
    if (!selectedCategoryId) return []
    return doaList.filter((d) => d.categoryId === selectedCategoryId)
  }, [doaList, selectedCategoryId])

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, searchQuery])

  const arabSizeClass = {
    small: 'text-2xl leading-[2.2]',
    medium: 'text-3xl leading-[2.2]',
    large: 'text-4xl leading-[2.2]',
  }[settings.arabSize]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [selectedCategoryId])

  const handleSelectCategory = (categoryId: string) => {
    setSearchQuery('')
    setIsDoaIndexOpen(false)
    setSearchParams({ kategori: categoryId }, { state: { fromDoaCategories: true } })
  }

  const handleBackToCategories = () => {
    setSearchQuery('')
    setIsDoaIndexOpen(false)
    const fromCategories = Boolean(
      (location.state as { fromDoaCategories?: boolean } | null)?.fromDoaCategories,
    )
    if (fromCategories) {
      navigate(-1)
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const handleJumpToDoa = (doaId: string | number) => {
    setIsDoaIndexOpen(false)
    const el = document.getElementById(`doa-card-${doaId}`)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 76
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }
  }

  // ==========================================================
  // TAMPILAN 2: DETAIL JENIS DOA YANG DIPILIH BESERTA DAFTARNYA
  // ==========================================================
  if (selectedCategoryId && !isLoading && !isError && activeCategory) {
    const categoryTitle = activeCategory.name.toLowerCase().startsWith('doa')
      ? activeCategory.name
      : `Doa ${activeCategory.name}`

    return (
      <div className="min-h-screen pb-14">
        <div className="sr-only" role="status" aria-live="polite">
          {feedbackMessage}
        </div>

        {/* Header Besar Bertuliskan Jenis Doa yang Dipilih */}
        <header className="relative overflow-hidden bg-gradient-to-b from-[#1F7A4D] via-[#176340] to-[#0B2E20] text-white pt-4 pb-8 shadow-sm">
          <div className="mx-auto max-w-[720px] px-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToCategories}
                aria-label="Kembali ke pilihan jenis doa"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-[#F7F5EC]">
                {categoryDoaList.length} Doa
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[#E0B863] ring-1 ring-white/20">
                {getCategoryIcon(activeCategory.id)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-[#E0B863]">
                  Kumpulan Doa
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {categoryTitle}
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[720px] px-4 pt-4 space-y-4">
          {/* Fitur Daftar Doa (Sticky mengikuti scroll, tinggi ringkas, tombol kembali di kiri) */}
          <div ref={doaIndexRef} className="sticky top-2 z-30">
            <div className="relative w-full">
              <Card className="flex items-center gap-1.5 px-2 py-1 bg-surface/95 backdrop-blur-md shadow-md">
                <button
                  type="button"
                  onClick={handleBackToCategories}
                  aria-label="Kembali ke halaman sebelumnya"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text hover:bg-primary-soft/30 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <div className="h-4 w-px bg-border shrink-0" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setIsDoaIndexOpen((prev) => !prev)}
                  aria-expanded={isDoaIndexOpen}
                  className="flex flex-1 min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-sm font-semibold text-text hover:bg-primary-soft/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <span className="truncate">Daftar Doa ({categoryDoaList.length})</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-text-muted transition-transform duration-200',
                      isDoaIndexOpen && 'rotate-180',
                    )}
                  />
                </button>
              </Card>

              {isDoaIndexOpen && (
                <div
                  role="menu"
                  aria-label={`Daftar ${categoryTitle}`}
                  className="absolute left-0 right-0 top-full mt-2 z-30 max-h-64 overflow-y-auto divide-y divide-border/70 rounded-2xl border border-border bg-surface shadow-xl"
                >
                  {categoryDoaList.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      onClick={() => handleJumpToDoa(item.id)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-primary-soft/25 transition-colors cursor-pointer"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-ink">
                        {idx + 1}
                      </span>
                      <span className="flex-1 truncate font-medium text-text">
                        {item.title}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daftar Doa Beserta Nomor Urut, Judul, dan Isi Doa */}
          {categoryDoaList.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={32} strokeWidth={1.75} />}
              title="Belum Ada Doa"
              description={`Belum ada doa pada kategori ${activeCategory.name}.`}
            />
          ) : (
            <div className="space-y-4">
              {categoryDoaList.map((doa, idx) => {
                const orderNumber = idx + 1
                const isFav = isFavorite(doa.id)

                return (
                  <Card
                    key={doa.id}
                    id={`doa-card-${doa.id}`}
                    className="p-4 sm:p-5 space-y-4"
                  >
                    {/* Nomor Urut + Judul Doa + Tombol Favorit */}
                    <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          aria-label={`Doa nomor ${orderNumber}`}
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-ink"
                        >
                          {orderNumber}
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-text leading-snug">
                            {doa.title}
                          </h2>
                          {doa.source && (
                            <p className="mt-0.5 text-xs text-text-muted">
                              {doa.source}
                            </p>
                          )}
                        </div>
                      </div>

                      <IconButton
                        label={
                          isFav
                            ? `Hapus ${doa.title} dari favorit`
                            : `Simpan ${doa.title} ke favorit`
                        }
                        icon={
                          <Heart
                            className={cn(
                              'h-4 w-4 transition-colors',
                              isFav
                                ? 'fill-gold text-gold'
                                : 'text-text-muted hover:text-text',
                            )}
                          />
                        }
                        onClick={() => toggleFavorite(doa.id)}
                        className="h-9 w-9 min-h-[44px] min-w-[44px] shrink-0"
                      />
                    </div>

                    {/* Teks Arab */}
                    <div
                      dir="rtl"
                      lang="ar"
                      className={cn(
                        'w-full text-right font-arab text-text',
                        arabSizeClass,
                      )}
                    >
                      {doa.arabic}
                    </div>

                    {/* Transliterasi Latin */}
                    {settings.showTransliteration && doa.transliteration && (
                      <p className="text-sm italic text-primary-ink/90 leading-relaxed">
                        {doa.transliteration}
                      </p>
                    )}

                    {/* Terjemahan */}
                    {settings.showTranslation && doa.translation && (
                      <p className="text-[15px] leading-relaxed text-text">
                        &ldquo;{doa.translation}&rdquo;
                      </p>
                    )}

                    {/* Tautan Detail / Fawaid */}
                    {doa.fawaid && (
                      <div className="pt-1 flex justify-end">
                        <Link
                          to={`/doa/${doa.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        >
                          <span>Lihat fawaid</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ==========================================================
  // TAMPILAN 1: CARD BERSUSUN PILIH JENIS DOA
  // ==========================================================
  return (
    <div className="min-h-screen pb-12">
      <Header
        title="Doa Harian"
        subtitle="Pilih jenis doa sesuai kebutuhan"
        showBack={true}
      />

      <main className="mx-auto max-w-[720px] px-4 pt-3">
        <div className="mb-4">
          <SearchField
            label="Cari jenis doa"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jenis doa (misal: tidur, makan, perjalanan)..."
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Doa"
            description={errorMessage || 'Terjadi kesalahan saat memuat data doa.'}
            onRetry={handleRetry}
          />
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            icon={<Search size={32} strokeWidth={1.75} />}
            title="Jenis Doa Tidak Ditemukan"
            description={`Tidak ada jenis doa yang cocok dengan pencarian "${searchQuery}".`}
          />
        ) : (
          <div className="space-y-3" role="list" aria-label="Pilihan jenis doa">
            {filteredCategories.map((cat) => {
              const count = categoryCounts.get(cat.id) ?? 0
              const label = cat.name.toLowerCase().startsWith('doa')
                ? cat.name
                : `Doa ${cat.name}`

              return (
                <button
                  key={cat.id}
                  type="button"
                  role="listitem"
                  onClick={() => handleSelectCategory(cat.id)}
                  className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl cursor-pointer"
                >
                  <Card
                    interactive
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
                        {getCategoryIcon(cat.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-text truncate">
                          {label}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {count} doa tersedia
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-text-muted shrink-0"
                    />
                  </Card>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
