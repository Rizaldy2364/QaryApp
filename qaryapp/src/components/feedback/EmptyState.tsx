import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-10 px-4 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        {icon}
      </div>
      <h2 className="mb-1 text-[17px] leading-6 font-semibold text-text">
        {title}
      </h2>
      <p className="max-w-[320px] text-sm leading-[22px] text-text-muted">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
