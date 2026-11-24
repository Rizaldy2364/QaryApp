import { cn } from '../../lib/utils'

export interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Memuat..."
      className={cn(
        'animate-pulse rounded-[6px] bg-border/60 motion-reduce:animate-none',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      <span className="sr-only">Memuat...</span>
    </div>
  )
}
