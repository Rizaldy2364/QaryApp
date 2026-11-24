import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface OfflineBannerProps {
  lastUpdated?: string
  className?: string
}

export function OfflineBanner({ lastUpdated, className }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine
    }
    return true
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex h-7 w-full items-center justify-center gap-2 bg-text px-4 text-xs text-bg transition-colors duration-150',
        className,
      )}
    >
      <WifiOff size={14} strokeWidth={1.75} />
      <span>
        Offline{lastUpdated ? ` • Terakhir diperbarui ${lastUpdated}` : ''}
      </span>
    </div>
  )
}
