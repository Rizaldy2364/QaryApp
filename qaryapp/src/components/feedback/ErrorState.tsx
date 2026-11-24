import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryText?: string
  className?: string
}

export function ErrorState({
  title = 'Gagal Memuat Data',
  description = 'Terjadi kendala saat memuat konten. Silakan periksa koneksi Anda dan coba kembali.',
  onRetry,
  retryText = 'Coba lagi',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center py-10 px-4 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle size={28} strokeWidth={1.75} />
      </div>
      <h2 className="mb-1 text-[17px] leading-6 font-semibold text-text">
        {title}
      </h2>
      <p className="max-w-[320px] text-sm leading-[22px] text-text-muted mb-5">
        {description}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  )
}
