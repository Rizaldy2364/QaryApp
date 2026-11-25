import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

const SPLASH_VISIBLE_MS = 2600
const SPLASH_FADE_MS = 400

export function SplashScreen() {
  const [isFading, setIsFading] = useState(false)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setIsFading(true)
    }, SPLASH_VISIBLE_MS)

    const unmountTimer = window.setTimeout(() => {
      setIsMounted(false)
    }, SPLASH_VISIBLE_MS + SPLASH_FADE_MS)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(unmountTimer)
    }
  }, [])

  if (!isMounted) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1F7A4D] via-[#176340] to-[#0B2E20] text-white transition-opacity duration-400 ease-out select-none',
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
    >
      {/* Ornamen bintang & kilau langit halus */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="#FFFFFF">
          <circle cx="52" cy="118" r="1.5" />
          <circle cx="318" cy="142" r="1.2" />
          <circle cx="110" cy="210" r="1" />
          <circle cx="284" cy="248" r="1.5" />
          <circle cx="64" cy="360" r="1.2" />
          <circle cx="334" cy="402" r="1.4" />
          <circle cx="145" cy="128" r="1" />
          <circle cx="240" cy="96" r="1.2" />
          <circle cx="310" cy="520" r="1.1" />
          <circle cx="78" cy="548" r="1.3" />
          {/* Bintang kecil berbentuk kilau (+) */}
          <path d="M88 158h4v-4h1.5v4h4v1.5h-4v4H92v-4h-4z" opacity="0.7" />
          <path d="M296 298h3.5v-3.5h1.5v3.5h3.5v1.5H301v3.5h-1.5V301H296z" opacity="0.65" />
          <path d="M56 462h3.5v-3.5h1.5v3.5h3.5v1.5H61v3.5h-1.5V465H56z" opacity="0.6" />
        </g>
      </svg>

      {/* Logo dan Nama Aplikasi di Tengah */}
      <div className="relative z-10 flex flex-col items-center justify-center -mt-12 px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[26px] bg-white/12 p-1.5 shadow-2xl ring-2 ring-white/25 backdrop-blur-xs">
          <img
            src="/qaryapp-icon.svg"
            alt="Logo QaryApp"
            width={84}
            height={84}
            className="h-full w-full rounded-[20px] object-contain"
          />
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          QaryApp
        </h1>
      </div>

      {/* Siluet Masjid di Bagian Bawah */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center">
        <svg
          viewBox="0 0 400 180"
          preserveAspectRatio="xMidYMax slice"
          className="h-44 w-full max-w-2xl sm:h-52 fill-[#072116]/60"
        >
          {/* Menara Kiri Jauh */}
          <rect x="26" y="72" width="12" height="108" />
          <path d="M24 72 Q32 54 40 72 Z" />
          <rect x="31" y="47" width="2" height="10" />

          {/* Kubah Kiri */}
          <path d="M62 130 C62 96 110 96 110 130 Z" />
          <rect x="58" y="130" width="56" height="50" />

          {/* Menara Kiri Tengah */}
          <rect x="118" y="42" width="16" height="138" />
          <rect x="115" y="68" width="22" height="4" rx="1" />
          <path d="M116 42 Q126 20 136 42 Z" />
          <rect x="125" y="12" width="2" height="12" />

          {/* Kubah Utama Tengah */}
          <path d="M148 122 C148 64 252 64 252 122 Z" />
          <rect x="199" y="46" width="2" height="22" />
          <circle cx="200" cy="44" r="3.5" />
          <rect x="142" y="122" width="116" height="58" />

          {/* Menara Kanan Tengah */}
          <rect x="266" y="42" width="16" height="138" />
          <rect x="263" y="68" width="22" height="4" rx="1" />
          <path d="M264 42 Q274 20 284 42 Z" />
          <rect x="273" y="12" width="2" height="12" />

          {/* Kubah Kanan */}
          <path d="M290 130 C290 96 338 96 338 130 Z" />
          <rect x="286" y="130" width="56" height="50" />

          {/* Menara Kanan Jauh */}
          <rect x="362" y="72" width="12" height="108" />
          <path d="M360 72 Q368 54 376 72 Z" />
          <rect x="367" y="47" width="2" height="10" />

          {/* Dasar Penuh */}
          <rect x="0" y="150" width="400" height="30" />
        </svg>
      </div>
    </div>
  )
}
