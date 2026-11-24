import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router'
import { BookOpen, Heart, CircleDot, Pause, Play, ChevronRight } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { Skeleton } from '../../components/feedback/Skeleton'
import { getSurahDetail } from '../../features/quran/api'
import { loadDoaData } from '../../features/doa/api'
import { usePageTitle } from '../../lib/usePageTitle'
import type { Doa } from '../../types'
import featuredData from '../../data/featured.json'
import {
  MalamBackground,
  SenjaBackground,
  PolaBackground,
} from './CarouselBackgrounds'

export interface CarouselCardItem {
  id: string
  type: 'verse' | 'doa' | 'wisdom'
  badgeLabel: string
  arabicText?: string
  translationText: string
  sourceOrRef: string
  bgType: 'malam' | 'senja' | 'pola'
  actionUrl?: string
}

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function QuranDoaPage() {
  usePageTitle("Al-Qur'an & Doa")
  const [cards, setCards] = useState<CarouselCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialReducedMotion)

  const carouselRef = useRef<HTMLDivElement>(null)
  const isHoveredRef = useRef(false)
  const isFocusedRef = useRef(false)
  const isInteractingTouchRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pantau perubahan preferensi reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Muat data untuk carousel
  useEffect(() => {
    let ignore = false

    async function fetchFeaturedItems() {
      try {
        const doaPayload = await loadDoaData()
        const doaMap = new Map<string, Doa>()
        for (const item of doaPayload.doa) {
          doaMap.set(String(item.id), item)
        }

        // Ambil ayat yang valid
        const resolvedVerses: CarouselCardItem[] = []
        for (let i = 0; i < featuredData.verses.length; i++) {
          const v = featuredData.verses[i]
          try {
            const detail = await getSurahDetail(v.surah)
            const targetAyah = detail.surah.ayahs?.find((a) => a.number === v.ayah)
            if (targetAyah) {
              resolvedVerses.push({
                id: `verse-${v.surah}-${v.ayah}`,
                type: 'verse',
                badgeLabel: 'Ayat Pilihan',
                arabicText: targetAyah.arabicText,
                translationText: targetAyah.translationText,
                sourceOrRef: `QS. ${detail.surah.nameLatin}: ${targetAyah.number}`,
                bgType: 'malam',
                actionUrl: `/quran/${v.surah}?ayat=${v.ayah}`,
              })
            }
          } catch {
            // Abaikan ayat yang gagal dimuat dari cache/network
          }
        }

        // Ambil doa
        const resolvedDoas: CarouselCardItem[] = []
        for (let i = 0; i < featuredData.doas.length; i++) {
          const dId = featuredData.doas[i]
          const d = doaMap.get(dId)
          if (d) {
            resolvedDoas.push({
              id: `doa-${d.id}`,
              type: 'doa',
              badgeLabel: 'Doa Pilihan',
              arabicText: d.arabic,
              translationText: d.translation,
              sourceOrRef: d.title,
              bgType: 'senja',
              actionUrl: `/doa/${d.id}`,
            })
          }
        }

        // Ambil kata mutiara / hikmah (fawaid)
        const resolvedWisdom: CarouselCardItem[] = []
        for (let i = 0; i < featuredData.wordsOfWisdom.length; i++) {
          const wId = featuredData.wordsOfWisdom[i]
          const d = doaMap.get(wId)
          if (d && d.fawaid) {
            resolvedWisdom.push({
              id: `wisdom-${d.id}`,
              type: 'wisdom',
              badgeLabel: 'Untaian Faidah',
              translationText: d.fawaid,
              sourceOrRef: `Faidah ${d.title}`,
              bgType: 'pola',
              actionUrl: `/doa/${d.id}`,
            })
          }
        }

        // Interleave urutan: Ayat, Doa, Faidah, Ayat, Doa, Faidah...
        const interleaved: CarouselCardItem[] = []
        const maxLen = Math.max(
          resolvedVerses.length,
          resolvedDoas.length,
          resolvedWisdom.length,
        )

        for (let i = 0; i < maxLen; i++) {
          if (i < resolvedVerses.length) interleaved.push(resolvedVerses[i])
          if (i < resolvedDoas.length) interleaved.push(resolvedDoas[i])
          if (i < resolvedWisdom.length) interleaved.push(resolvedWisdom[i])
        }

        if (!ignore) {
          setCards(interleaved)
          setLoading(false)
        }
      } catch {
        if (!ignore) {
          setCards([])
          setLoading(false)
        }
      }
    }

    fetchFeaturedItems()

    return () => {
      ignore = true
    }
  }, [])

  // Fungsi scroll ke kartu tertentu
  const scrollToIndex = useCallback((index: number) => {
    if (!carouselRef.current) return
    const container = carouselRef.current
    const cardEl = container.children[index] as HTMLElement | undefined
    if (cardEl) {
      container.scrollTo({
        left: cardEl.offsetLeft - 16,
        behavior: 'smooth',
      })
      setActiveIndex(index)
    }
  }, [])

  // Auto-rotate 7 detik
  useEffect(() => {
    if (loading || cards.length <= 1 || isPaused || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      if (
        isHoveredRef.current ||
        isFocusedRef.current ||
        isInteractingTouchRef.current ||
        document.hidden
      ) {
        return
      }

      setActiveIndex((prev) => {
        const next = (prev + 1) % cards.length
        if (carouselRef.current) {
          const cardEl = carouselRef.current.children[next] as HTMLElement | undefined
          if (cardEl) {
            carouselRef.current.scrollTo({
              left: cardEl.offsetLeft - 16,
              behavior: 'smooth',
            })
          }
        }
        return next
      })
    }, 7000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [cards.length, isPaused, loading, prefersReducedMotion])

  // Sinkronisasi index aktif saat scroll manual selesai
  const handleScroll = () => {
    if (!carouselRef.current || cards.length === 0) return
    const container = carouselRef.current
    const scrollLeft = container.scrollLeft
    let closestIdx = 0
    let minDiff = Infinity

    for (let i = 0; i < container.children.length; i++) {
      const el = container.children[i] as HTMLElement
      const diff = Math.abs(el.offsetLeft - 16 - scrollLeft)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = i
      }
    }

    if (closestIdx !== activeIndex) {
      setActiveIndex(closestIdx)
    }
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header
        title="Al-Qur'an & Doa"
        subtitle="Baca, renungkan, dan amalkan"
      />

      <div className="mx-auto max-w-[720px] px-4 pt-4">
        {/* Seksi Renungan Hari Ini / Carousel */}
        {loading ? (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-[208px] w-full rounded-2xl" />
          </div>
        ) : cards.length > 0 ? (
          <section
            aria-roledescription="carousel"
            aria-label="Renungan Hari Ini"
            className="mb-8"
            onMouseEnter={() => {
              isHoveredRef.current = true
            }}
            onMouseLeave={() => {
              isHoveredRef.current = false
            }}
            onFocus={() => {
              isFocusedRef.current = true
            }}
            onBlur={() => {
              isFocusedRef.current = false
            }}
            onTouchStart={() => {
              isInteractingTouchRef.current = true
            }}
            onTouchEnd={() => {
              isInteractingTouchRef.current = false
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] leading-5 font-semibold text-text uppercase tracking-wider">
                Renungan hari ini
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">
                  {activeIndex + 1}/{cards.length}
                </span>
                <IconButton
                  label={isPaused ? 'Putar carousel otomatis' : 'Jeda carousel otomatis'}
                  icon={
                    isPaused ? (
                      <Play className="h-4 w-4 text-text" />
                    ) : (
                      <Pause className="h-4 w-4 text-text" />
                    )
                  }
                  onClick={() => setIsPaused((prev) => !prev)}
                  className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-full"
                />
              </div>
            </div>

            {/* Scroll-snap container */}
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-2"
              tabIndex={0}
              aria-live="polite"
            >
              {cards.map((card, idx) => (
                <div
                  key={card.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${card.badgeLabel}: slide ${idx + 1} dari ${cards.length}`}
                  className="relative h-[208px] w-[calc(100vw-48px)] max-w-[calc(720px-32px)] shrink-0 snap-start overflow-hidden rounded-2xl p-5 shadow-xs select-none"
                >
                  {/* Background Ilustrasi */}
                  {card.bgType === 'malam' && <MalamBackground />}
                  {card.bgType === 'senja' && <SenjaBackground />}
                  {card.bgType === 'pola' && <PolaBackground />}

                  {/* Top Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="inline-block rounded-full bg-art-green-dark/70 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-xs">
                      {card.badgeLabel}
                    </span>
                  </div>

                  {/* Isi Konten */}
                  <div className="relative z-10 mt-3 flex h-[130px] flex-col justify-between text-white">
                    <div className="overflow-hidden">
                      {card.arabicText ? (
                        <p
                          dir="rtl"
                          className="font-arabic text-right text-base leading-relaxed line-clamp-2 text-art-cream drop-shadow-xs"
                        >
                          {card.arabicText}
                        </p>
                      ) : null}
                      <p
                        className={`text-xs leading-relaxed text-art-cream/95 line-clamp-3 mt-1.5 ${
                          card.type === 'wisdom' ? 'italic text-sm line-clamp-4' : ''
                        }`}
                      >
                        &ldquo;{card.translationText}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium text-art-gold drop-shadow-xs truncate max-w-[70%]">
                        {card.sourceOrRef}
                      </span>
                      {card.actionUrl && (
                        <Link
                          to={card.actionUrl}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white hover:text-art-gold transition-colors"
                        >
                          Lihat detail
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Indikator Titik */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {cards.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Buka slide ${idx + 1}`}
                  onClick={() => scrollToIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                    activeIndex === idx
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-border hover:bg-text-muted/40'
                  }`}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Seksi Jelajahi: 3 Kotak Bersebelahan (Al-Qur'an, Doa, dan Dzikir) */}
        <section aria-label="Jelajahi Konten" className="mb-6">
          <h2 className="mb-3 text-[13px] leading-5 font-semibold text-text uppercase tracking-wider">
            Jelajahi
          </h2>
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
      </div>
    </div>
  )
}
export default QuranDoaPage
