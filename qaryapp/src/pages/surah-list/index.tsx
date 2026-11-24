import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { SearchField } from '../../components/ui/SearchField'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { OfflineBanner } from '../../components/feedback/OfflineBanner'
import { getSurahList } from '../../features/quran/api'
import { matchSurah } from '../../features/quran/lib/search'
import { usePageTitle } from '../../lib/usePageTitle'
import type { Surah } from '../../features/quran/types'

export default function SurahListPage() {
  usePageTitle('Daftar Surah')
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isStaleCache, setIsStaleCache] = useState(false)

  useEffect(() => {
    let ignore = false
    getSurahList()
      .then((result) => {
        if (!ignore) {
          setSurahs(result.surahs)
          setIsStaleCache(result.isStale && !navigator.onLine)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setIsError(true)
          setErrorMessage(
            err instanceof Error ? err.message : 'Gagal memuat daftar surah',
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
    getSurahList()
      .then((result) => {
        setSurahs(result.surahs)
        setIsStaleCache(result.isStale && !navigator.onLine)
        setIsLoading(false)
      })
      .catch((err) => {
        setIsError(true)
        setErrorMessage(
          err instanceof Error ? err.message : 'Gagal memuat daftar surah',
        )
        setIsLoading(false)
      })
  }

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs
    return surahs.filter((s) => matchSurah(s, searchQuery))
  }, [surahs, searchQuery])

  return (
    <div className="min-h-screen pb-12">
      <Header
        title="Al-Qur'an"
        subtitle="114 surah"
        showBack={true}
      />

      <main className="mx-auto max-w-[720px] px-4 pt-3">
        {isStaleCache && (
          <div className="mb-4">
            <OfflineBanner />
          </div>
        )}

        <div className="mb-4">
          <SearchField
            label="Cari surah berdasarkan nama Latin, arti, atau nomor"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari surah atau nomor..."
          />
        </div>

        {isLoading ? (
          <Card className="divide-y divide-border p-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 p-3.5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </Card>
        ) : isError ? (
          <ErrorState
            title="Tidak Dapat Memuat Surah"
            description={errorMessage || 'Terjadi kesalahan saat memuat daftar surah.'}
            onRetry={handleRetry}
          />
        ) : filteredSurahs.length === 0 ? (
          <EmptyState
            icon={<Search size={32} strokeWidth={1.75} />}
            title="Surah Tidak Ditemukan"
            description={`Tidak ada surah yang cocok dengan pencarian "${searchQuery}".`}
          />
        ) : (
          <Card className="overflow-hidden divide-y divide-border p-0">
            {filteredSurahs.map((surah) => (
              <Link
                key={surah.number}
                to={`/quran/${surah.number}`}
                className="flex items-center gap-3.5 p-3.5 transition-colors hover:bg-surface-elevated active:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* Kotak nomor surah 36x36 */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary-ink"
                  aria-hidden="true"
                >
                  {surah.number}
                </div>

                {/* Nama Latin dan info */}
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-text">
                    {surah.nameLatin}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {surah.translation} · {surah.totalAyahs} ayat · {surah.revelationPlace}
                  </div>
                </div>

                {/* Nama Arab di sebelah kanan */}
                <div
                  dir="rtl"
                  lang="ar"
                  className="shrink-0 font-arab text-2xl text-text leading-none"
                >
                  {surah.nameArabic}
                </div>
              </Link>
            ))}
          </Card>
        )}
      </main>
    </div>
  )
}
