import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Search } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { SearchField } from '../../components/ui/SearchField'
import { Chip } from '../../components/ui/Chip'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { loadDoaData } from '../../features/doa/api'
import { matchDoa } from '../../features/doa/lib/search'
import type { Doa, DoaCategory } from '../../types'

export default function DoaListPage() {
  const [categories, setCategories] = useState<DoaCategory[]>([])
  const [doaList, setDoaList] = useState<Doa[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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

  // Pemetaan ID kategori ke nama kategori
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories])

  // Filter daftar doa berdasarkan kategori dan pencarian
  const filteredDoa = useMemo(() => {
    return doaList.filter((d) => {
      // 1. Filter Kategori
      if (selectedCategoryId !== 'all' && d.categoryId !== selectedCategoryId) {
        return false
      }
      // 2. Filter Pencarian
      const catName = categoryMap.get(d.categoryId) || ''
      return matchDoa(d, catName, searchQuery)
    })
  }, [doaList, selectedCategoryId, searchQuery, categoryMap])

  return (
    <div className="min-h-screen pb-12">
      <Header
        title="Doa Harian"
        subtitle="Doa sehari-hari beserta artinya"
        showBack={true}
      />

      <main className="mx-auto max-w-[720px] px-4 pt-3">
        {/* Kolom Pencarian */}
        <div className="mb-3">
          <SearchField
            label="Cari doa berdasarkan judul atau kategori"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari doa..."
          />
        </div>

        {/* Deretan Chip Kategori (Dapat digulir mendatar) */}
        <div
          role="region"
          aria-label="Pilihan kategori doa"
          className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
        >
          <Chip
            selected={selectedCategoryId === 'all'}
            onClick={() => setSelectedCategoryId('all')}
          >
            Semua ({doaList.length})
          </Chip>
          {categories.map((cat) => {
            const count = doaList.filter((d) => d.categoryId === cat.id).length
            return (
              <Chip
                key={cat.id}
                selected={selectedCategoryId === cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.name} ({count})
              </Chip>
            )
          })}
        </div>

        {/* Keadaan Memuat */}
        {isLoading ? (
          <Card className="divide-y divide-border p-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            ))}
          </Card>
        ) : isError ? (
          <ErrorState
            title="Gagal Memuat Doa"
            description={errorMessage || 'Terjadi kesalahan saat memuat data doa.'}
            onRetry={handleRetry}
          />
        ) : filteredDoa.length === 0 ? (
          <EmptyState
            icon={<Search size={32} strokeWidth={1.75} />}
            title="Doa Tidak Ditemukan"
            description={
              searchQuery
                ? `Tidak ada doa yang cocok dengan pencarian "${searchQuery}".`
                : 'Tidak ada doa dalam kategori ini.'
            }
          />
        ) : (
          <Card className="overflow-hidden divide-y divide-border p-0">
            {filteredDoa.map((doa) => {
              const catName = categoryMap.get(doa.categoryId) || doa.categoryId
              return (
                <Link
                  key={doa.id}
                  to={`/doa/${doa.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-surface-elevated active:bg-primary-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="text-[15px] font-semibold text-text">
                      {doa.title}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {catName}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-text-muted shrink-0" />
                </Link>
              )
            })}
          </Card>
        )}
      </main>
    </div>
  )
}
