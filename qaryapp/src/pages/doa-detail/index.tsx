import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router'
import { Heart } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { IconButton } from '../../components/ui/IconButton'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/feedback/Skeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { loadDoaData } from '../../features/doa/api'
import { useDoaFavorites } from '../../features/doa/useDoaFavorites'
import { useSettings } from '../../features/settings/useSettings'
import { cn } from '../../lib/utils'
import type { Doa, DoaCategory } from '../../types'

export default function DoaDetailPage() {
  const { doaId } = useParams<{ doaId: string }>()
  const { settings } = useSettings()
  const { isFavorite, toggleFavorite, feedbackMessage } = useDoaFavorites()

  const [doa, setDoa] = useState<Doa | null>(null)
  const [categories, setCategories] = useState<DoaCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    let ignore = false
    loadDoaData()
      .then((data) => {
        if (!ignore) {
          setCategories(data.categories)
          const found = data.doa.find((d) => String(d.id) === String(doaId))
          if (found) {
            setDoa(found)
          } else {
            setIsError(true)
          }
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          setIsError(true)
          setIsLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [doaId])

  const categoryName = useMemo(() => {
    if (!doa) return ''
    const found = categories.find((c) => c.id === doa.categoryId)
    return found ? found.name : doa.categoryId
  }, [doa, categories])

  const arabSizeClass = {
    small: 'text-2xl leading-[2.2]',
    medium: 'text-3xl leading-[2.2]',
    large: 'text-4xl leading-[2.2]',
  }[settings.arabSize]

  const isFav = doa ? isFavorite(doa.id) : false

  return (
    <div className="min-h-screen pb-12">
      {/* Area aria-live untuk notifikasi pembaca layar */}
      <div className="sr-only" role="status" aria-live="polite">
        {feedbackMessage}
      </div>

      <Header
        title={doa ? doa.title : 'Detail Doa'}
        showBack={true}
        rightAction={
          doa ? (
            <IconButton
              label={isFav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
              icon={
                <Heart
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isFav
                      ? 'fill-gold text-gold'
                      : 'text-text-muted hover:text-text',
                  )}
                />
              }
              onClick={() => toggleFavorite(doa.id)}
            />
          ) : undefined
        }
      />

      <main className="mx-auto max-w-[720px] px-4 pt-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : isError || !doa ? (
          <div className="pt-8">
            <ErrorState
              title="Doa Tidak Ditemukan"
              description="Doa yang Anda cari tidak tersedia atau tautan salah."
              retryText="Kembali ke Daftar Doa"
            />
            <div className="flex justify-center mt-4">
              <Link to="/doa">
                <Button variant="primary">Kembali ke Daftar Doa</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Badge Kategori & Penanda Dev */}
            <div className="flex flex-col items-center gap-1.5 mb-2">
              <Badge variant="default" className="text-xs px-3 py-1 font-medium">
                {categoryName}
              </Badge>

              {/* Penanda mode dev: hanya tampil bila belum ditinjau dan sedang development */}
              {import.meta.env.DEV && doa.reviewStatus === 'unreviewed' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-danger/15 text-danger font-medium">
                  Belum ditinjau (Dev Mode)
                </span>
              )}
            </div>

            {/* Kartu Teks Arab */}
            <Card className="p-5">
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
            </Card>

            {/* Kartu Transliterasi Latin (Bila ada) */}
            {doa.transliteration && (
              <Card className="p-4 bg-surface">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Transliterasi
                </div>
                <div className="text-sm italic text-primary-ink/90 leading-relaxed">
                  {doa.transliteration}
                </div>
              </Card>
            )}

            {/* Kartu Terjemahan / Artinya */}
            <Card className="p-4 bg-surface">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Artinya
              </div>
              <div className="text-[15px] leading-relaxed text-text">
                {doa.translation}
              </div>
            </Card>

            {/* Keterangan Sumber / Dalil (Penyimpangan kecil yang informatif) */}
            {doa.source && (
              <div className="px-1 text-xs leading-normal text-text-muted">
                Sumber: {doa.source}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
