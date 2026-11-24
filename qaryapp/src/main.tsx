import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Daftarkan service worker secara native untuk mode production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[SW Registration Error]', error)
    })
  })
}

// Muat hanya subset dan bobot yang dipakai:
// - Amiri: 400 & 700 (Arabic dan Latin)
// - Plus Jakarta Sans: 400, 500, 600 (Latin)
import '@fontsource/amiri/arabic-400.css'
import '@fontsource/amiri/arabic-700.css'
import '@fontsource/amiri/latin-400.css'
import '@fontsource/amiri/latin-700.css'

import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
