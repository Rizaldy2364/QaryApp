import { useEffect } from 'react'

/**
 * Hook untuk mengubah document.title dan mengumumkan judul halaman secara konsisten.
 * Format: "{title} · QaryApp"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} · QaryApp`

    return () => {
      document.title = previousTitle
    }
  }, [title])
}
