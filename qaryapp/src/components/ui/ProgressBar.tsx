import { cn } from '../../lib/utils'

export interface ProgressBarProps {
  value: number // 0 sampai 100
  label?: string
  className?: string
}

export function ProgressBar({
  value,
  label = 'Progres',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-primary-soft',
        className,
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-200 motion-reduce:transition-none"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  )
}
