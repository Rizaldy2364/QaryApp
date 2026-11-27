import { useCallback, useEffect, useState } from 'react'
import {
  addDoaFavorite,
  getDoaFavorites,
  LOCAL_DATA_SYNCED_EVENT,
  removeDoaFavorite,
} from '../../lib/storage'
import type { DoaFavorite } from '../../types'

export function useDoaFavorites() {
  const [favorites, setFavorites] = useState<DoaFavorite[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState<string>('')

  const refreshFavorites = useCallback(async () => {
    try {
      const list = await getDoaFavorites()
      setFavorites(list)
      setFavoriteIds(new Set(list.map((f) => String(f.doaId))))
    } catch {
      // Abaikan error pembacaan
    }
  }, [])

  useEffect(() => {
    let ignore = false
    getDoaFavorites()
      .then((list) => {
        if (!ignore) {
          setFavorites(list)
          setFavoriteIds(new Set(list.map((f) => String(f.doaId))))
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) setIsLoading(false)
      })

    const handleSynced = () => {
      void refreshFavorites()
    }
    window.addEventListener(LOCAL_DATA_SYNCED_EVENT, handleSynced)

    return () => {
      ignore = true
      window.removeEventListener(LOCAL_DATA_SYNCED_EVENT, handleSynced)
    }
  }, [refreshFavorites])

  const isFavorite = useCallback(
    (doaId: string | number): boolean => {
      return favoriteIds.has(String(doaId))
    },
    [favoriteIds],
  )

  const toggleFavorite = useCallback(
    async (doaId: string | number): Promise<boolean> => {
      const idStr = String(doaId)
      const nextFav = !favoriteIds.has(idStr)

      // Optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (nextFav) next.add(idStr)
        else next.delete(idStr)
        return next
      })

      try {
        if (nextFav) {
          const entry: DoaFavorite = {
            doaId,
            createdAt: new Date().toISOString(),
          }
          await addDoaFavorite(entry)
          setFavorites((prev) => [
            ...prev.filter((f) => String(f.doaId) !== idStr),
            entry,
          ])
          setFeedbackMessage('Doa ditambahkan ke favorit')
        } else {
          await removeDoaFavorite(doaId)
          setFavorites((prev) => prev.filter((f) => String(f.doaId) !== idStr))
          setFeedbackMessage('Doa dihapus dari favorit')
        }
        return nextFav
      } catch (err) {
        // Rollback on failure
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (!nextFav) next.add(idStr)
          else next.delete(idStr)
          return next
        })
        setFeedbackMessage('Gagal memperbarui status favorit')
        throw err
      }
    },
    [favoriteIds],
  )

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    isLoading,
    feedbackMessage,
  }
}
