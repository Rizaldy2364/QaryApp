import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Daftarkan service worker dengan auto-update, cek pembaruan berkala (setiap 1 jam),
// dan muat ulang otomatis saat service worker baru mengambil alih kontrol.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloading) {
      reloading = true
      window.location.reload()
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        void registration.update()
        window.setInterval(() => {
          void registration.update()
        }, 60 * 60 * 1000)
      })
      .catch((error) => {
        console.warn('[SW Registration Error]', error)
      })
  })
}

// Tangani kegagalan memuat chunk dinamis setelah pembaruan versi (Vite chunk preload error)
const RELOAD_KEY = 'qaryapp:chunk_reload'
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (!sessionStorage.getItem(RELOAD_KEY)) {
    sessionStorage.setItem(RELOAD_KEY, 'true')
    window.location.reload()
  }
})

// Hapus penanda reload saat aplikasi berhasil dimuat
try {
  sessionStorage.removeItem(RELOAD_KEY)
} catch {
  // Abaikan bila sessionStorage tidak dapat diakses
}

// Muat hanya subset dan bobot yang dipakai:
// - Amiri: 400 (Arabic dan Latin) - bobot 700 tidak digunakan di aplikasi
// - Plus Jakarta Sans: 400, 500, 600 (Latin)
import '@fontsource/amiri/arabic-400.css'
import '@fontsource/amiri/latin-400.css'

import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
