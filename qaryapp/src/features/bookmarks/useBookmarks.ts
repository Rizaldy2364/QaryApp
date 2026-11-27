import { useCallback, useEffect, useState } from 'react'
import {
  addAyahBookmark,
  getAyahBookmarks,
  LOCAL_DATA_SYNCED_EVENT,
  removeAyahBookmark,
} from '../../lib/storage'
import type { AyahBookmark } from '../../types'

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<AyahBookmark[]>([])
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set())
  const [isLoading, setIsLoading] = useState(true)

  const refreshBookmarks = useCallback(async () => {
    try {
      const list = await getAyahBookmarks()
      setBookmarks(list)
      setBookmarkIds(new Set(list.map((b) => b.id)))
    } catch {
      // Abaikan error pembacaan
    }
  }, [])

  useEffect(() => {
    let ignore = false
    getAyahBookmarks()
      .then((list) => {
        if (!ignore) {
          setBookmarks(list)
          setBookmarkIds(new Set(list.map((b) => b.id)))
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          setIsLoading(false)
        }
      })

    const handleSynced = () => {
      void refreshBookmarks()
    }
    window.addEventListener(LOCAL_DATA_SYNCED_EVENT, handleSynced)

    return () => {
      ignore = true
      window.removeEventListener(LOCAL_DATA_SYNCED_EVENT, handleSynced)
    }
  }, [refreshBookmarks])

  const isBookmarked = useCallback(
    (surahNumber: number, ayahNumber: number): boolean => {
      const id = `${surahNumber}:${ayahNumber}`
      return bookmarkIds.has(id)
    },
    [bookmarkIds],
  )

  const toggleBookmark = useCallback(
    async (
      surahNumber: number,
      ayahNumber: number,
    ): Promise<boolean> => {
      const id = `${surahNumber}:${ayahNumber}`
      const currentlyBookmarked = bookmarkIds.has(id)
      const nextBookmarked = !currentlyBookmarked

      // Optimistic update
      setBookmarkIds((prev) => {
        const next = new Set(prev)
        if (nextBookmarked) {
          next.add(id)
        } else {
          next.delete(id)
        }
        return next
      })

      try {
        if (nextBookmarked) {
          const entry: AyahBookmark = {
            id,
            surahNumber,
            ayahNumber,
            createdAt: new Date().toISOString(),
          }
          await addAyahBookmark(entry)
          setBookmarks((prev) => [...prev.filter((b) => b.id !== id), entry])
        } else {
          await removeAyahBookmark(id)
          setBookmarks((prev) => prev.filter((b) => b.id !== id))
        }
        return nextBookmarked
      } catch (err) {
        // Rollback on failure
        setBookmarkIds((prev) => {
          const next = new Set(prev)
          if (currentlyBookmarked) {
            next.add(id)
          } else {
            next.delete(id)
          }
          return next
        })
        throw err
      }
    },
    [bookmarkIds],
  )

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    isLoading,
    refreshBookmarks,
  }
}
