import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * Mengembalikan posisi scroll ke paling atas (0, 0) setiap kali rute berpindah.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    // Fokuskan ke main content bila ada untuk aksesibilitas keyboard
    const mainEl = document.getElementById('main-content')
    if (mainEl) {
      mainEl.focus()
    }
  }, [pathname])

  return null
}
