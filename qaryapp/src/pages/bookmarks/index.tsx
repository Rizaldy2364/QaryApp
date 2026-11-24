import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { Bookmark, Heart, BookOpen, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { ListRow } from '../../components/ui/ListRow'
import { EmptyState } from '../../components/feedback/EmptyState'
import { Skeleton } from '../../components/feedback/Skeleton'
import { useBookmarks } from '../../features/bookmarks/useBookmarks'
import { useDoaFavorites } from '../../features/doa/useDoaFavorites'
import { getSurahDetail } from '../../features/quran/api'
import { loadDoaData } from '../../features/doa/api'
import { usePageTitle } from '../../lib/usePageTitle'
import type { Doa } from '../../types'

interface LoadedAyahBookmark {
  surahNumber: number
  ayahNumber: number
  surahNameLatin: string
  arabicText?: string
  translationText?: string
  failedToLoadText?: boolean
}

export function BookmarksPage() {
  usePageTitle('Tersimpan')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = searchParams.get('tab') === 'doa' ? 'doa' : 'ayat'

  const { bookmarks, toggleBookmark, isLoading: loadingBookmarks } = useBookmarks()
  const { favorites, toggleFavorite, isLoading: loadingFavorites, feedbackMessage: doaFeedback } = useDoaFavorites()

  // Data doa map untuk lookup judul & kategori
  const [doaMap, setDoaMap] = useState<Map<string, Doa>>(() => new Map())
  const [loadingDoaList, setLoadingDoaList] = useState(true)

  // Cache teks ayat yang dimuat
  const [ayahData, setAyahData] = useState<Map<string, { surahName: string; arabic?: string; translation?: string }>>(() => new Map())
  const [loadingAyahs, setLoadingAyahs] = useState(false)

  // Muat daftar doa
  useEffect(() => {
    let ignore = false
    loadDoaData()
      .then((payload) => {
        if (!ignore) {
          const map = new Map<string, Doa>()
          for (const d of payload.doa) {
            map.set(String(d.id), d)
          }
          setDoaMap(map)
          setLoadingDoaList(false)
        }
      })
      .catch(() => {
        if (!ignore) setLoadingDoaList(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // Muat detail surah untuk bookmarks ayat
  useEffect(() => {
    if (bookmarks.length === 0) return
    let ignore = false

    const surahNumbers = Array.from(new Set(bookmarks.map((b) => b.surahNumber)))

    Promise.all(
      surahNumbers.map(async (sNum) => {
        try {
          const res = await getSurahDetail(sNum)
          return { sNum, surah: res.surah }
        } catch {
          return { sNum, surah: null }
        }
      }),
    ).then((results) => {
      if (ignore) return
      setAyahData((prev) => {
        const next = new Map(prev)
        for (const res of results) {
          if (res.surah) {
            for (const ay of res.surah.ayahs || []) {
              next.set(`${res.sNum}:${ay.number}`, {
                surahName: res.surah.nameLatin,
                arabic: ay.arabicText,
                translation: ay.translationText,
              })
            }
          }
        }
        return next
      })
      setLoadingAyahs(false)
    }).catch(() => {
      if (!ignore) setLoadingAyahs(false)
    })

    return () => {
      ignore = true
    }
  }, [bookmarks])

  // Kelompokkan ayat berdasarkan surah
  const groupedAyatBookmarks = useMemo(() => {
    const groups: { surahNumber: number; surahName: string; items: LoadedAyahBookmark[] }[] = []
    const groupMap = new Map<number, LoadedAyahBookmark[]>()

    for (const b of bookmarks) {
      const list = groupMap.get(b.surahNumber) || []
      const detail = ayahData.get(`${b.surahNumber}:${b.ayahNumber}`)
      list.push({
        surahNumber: b.surahNumber,
        ayahNumber: b.ayahNumber,
        surahNameLatin: detail?.surahName || `Surah ${b.surahNumber}`,
        arabicText: detail?.arabic,
        translationText: detail?.translation,
        failedToLoadText: !detail && !loadingAyahs,
      })
      groupMap.set(b.surahNumber, list)
    }

    groupMap.forEach((items, surahNumber) => {
      const surahName = items[0]?.surahNameLatin || `Surah ${surahNumber}`
      groups.push({ surahNumber, surahName, items })
    })

    return groups
  }, [bookmarks, ayahData, loadingAyahs])

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true })
  }

  const tabsConfig = [
    {
      id: 'ayat',
      label: `Ayat (${bookmarks.length})`,
      icon: <Bookmark className="h-4 w-4" />,
    },
    {
      id: 'doa',
      label: `Doa (${favorites.length})`,
      icon: <Heart className="h-4 w-4" />,
    },
  ]

  return (
    <div className="pb-16">
      <Header title="Tersimpan" />

      {/* Pesan status pembaca layar (screen reader live region) */}
      <div className="sr-only" role="status" aria-live="polite">
        {doaFeedback}
      </div>

      <div className="mx-auto max-w-[720px]">
        {/* Tabs Bar */}
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        <div className="p-4">
          {/* TAB 1: AYAT */}
          {activeTab === 'ayat' && (
            <div>
              {loadingBookmarks ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : bookmarks.length === 0 ? (
                <EmptyState
                  icon={<Bookmark className="h-8 w-8 text-primary" />}
                  title="Belum ada ayat tersimpan"
                  description="Tandai ayat favoritmu saat membaca Al-Qur'an agar mudah diakses kembali di sini."
                  action={
                    <Button onClick={() => navigate('/quran')} icon={<BookOpen className="h-4 w-4" />}>
                      Mulai Baca Al-Qur'an
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-6">
                  {groupedAyatBookmarks.map((group) => (
                    <div key={group.surahNumber} className="space-y-3">
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wider">
                        {group.surahName}
                      </h2>
                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <Card
                            key={`${item.surahNumber}:${item.ayahNumber}`}
                            className="relative flex flex-col justify-between p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                onClick={() => navigate(`/quran/${item.surahNumber}?ayat=${item.ayahNumber}`)}
                                className="flex-1 cursor-pointer"
                              >
                                <span className="inline-block rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-ink mb-2">
                                  Ayat {item.ayahNumber}
                                </span>
                                {item.arabicText ? (
                                  <p
                                    dir="rtl"
                                    className="font-arabic text-right text-lg leading-loose text-text my-2 line-clamp-3"
                                  >
                                    {item.arabicText}
                                  </p>
                                ) : null}
                                {item.translationText ? (
                                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mt-1">
                                    {item.translationText}
                                  </p>
                                ) : item.failedToLoadText ? (
                                  <p className="text-xs italic text-text-muted mt-1">
                                    Teks belum tersimpan di perangkat (sambungkan internet untuk memuat)
                                  </p>
                                ) : (
                                  <Skeleton className="h-4 w-3/4 mt-2" />
                                )}
                              </div>

                              <IconButton
                                label={`Hapus bookmark QS. ${group.surahName} ayat ${item.ayahNumber}`}
                                icon={<Bookmark className="h-5 w-5 fill-gold text-gold" />}
                                onClick={() => toggleBookmark(item.surahNumber, item.ayahNumber)}
                                className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px]"
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOA */}
          {activeTab === 'doa' && (
            <div>
              {loadingFavorites || loadingDoaList ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : favorites.length === 0 ? (
                <EmptyState
                  icon={<Heart className="h-8 w-8 text-primary" />}
                  title="Belum ada doa favorit"
                  description="Simpan doa harian yang sering kamu amalkan untuk membukanya secara cepat kapan saja."
                  action={
                    <Button onClick={() => navigate('/doa')} icon={<Heart className="h-4 w-4" />}>
                      Jelajahi Doa Harian
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                  {favorites.map((fav) => {
                    const doa = doaMap.get(String(fav.doaId))
                    const title = doa?.title || `Doa #${fav.doaId}`
                    const subtitle = doa?.source || 'Doa Harian'

                    return (
                      <ListRow
                        key={String(fav.doaId)}
                        title={title}
                        subtitle={subtitle}
                        leftElement={
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <Heart className="h-5 w-5 fill-primary text-primary" />
                          </div>
                        }
                        rightElement={
                          <IconButton
                            label={`Hapus favorit ${title}`}
                            icon={<Trash2 className="h-4 w-4 text-text-muted hover:text-danger" />}
                            onClick={() => toggleFavorite(fav.doaId)}
                            className="h-10 w-10 min-h-[44px] min-w-[44px]"
                          />
                        }
                        onClick={() => navigate(`/doa/${fav.doaId}`)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default BookmarksPage
