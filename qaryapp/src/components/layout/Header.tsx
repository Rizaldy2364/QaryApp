import { useNavigate, useLocation } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  rightAction?: ReactNode
  className?: string
}

function getFallbackRoute(pathname: string): string {
  if (pathname.startsWith('/quran/')) return '/quran'
  if (pathname === '/quran' || pathname === '/doa') return '/quran-doa'
  if (pathname.startsWith('/doa/')) return '/doa'
  if (pathname === '/profil/sumber-data') return '/profil'
  if (pathname === '/lokasi/negara') return '/lokasi'
  if (
    pathname === '/lokasi' ||
    pathname === '/jadwal-sholat' ||
    pathname === '/notifikasi'
  ) {
    return '/'
  }
  return '/'
}

export function Header({
  title,
  subtitle,
  showBack = false,
  rightAction,
  className,
}: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    if (
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1)
    } else {
      navigate(getFallbackRoute(location.pathname))
    }
  }

  return (
    <header
      className={cn(
        'w-full pt-2.5 pb-1 transition-colors',
        className,
      )}
    >
      <div className="mx-auto flex min-h-11 max-w-180 items-center justify-between px-4">
        <div className="flex h-11 w-11 items-center justify-start">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Kembali"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-text hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-150 motion-reduce:transition-none cursor-pointer"
            >
              <ArrowLeft size={20} strokeWidth={1.75} />
            </button>
          ) : (
            <div className="h-11 w-11" />
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center px-2 min-w-0">
          <h1 className="text-[17px] leading-6 font-semibold text-text truncate w-full">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs leading-4 text-text-muted truncate w-full">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-end">
          {rightAction ?? <div className="h-11 w-11" />}
        </div>
      </div>
    </header>
  )
}
