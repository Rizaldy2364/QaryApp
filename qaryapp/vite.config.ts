import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: false, // Manifest dinonaktifkan untuk MVP (Fase 2)
      devOptions: {
        enabled: false, // Tidak aktif di mode development
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/dev/, /^\/api/],
        // Pastikan API pihak ketiga dan audio TIDAK dicegat service worker
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin.includes('aladhan.com') ||
              url.origin.includes('equran.id') ||
              url.origin.includes('open-meteo.com') ||
              url.pathname.endsWith('.mp3'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
