import type { ReactNode } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ListRowProps {
  title: string
  subtitle?: string
  leftElement?: ReactNode
  rightElement?: ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function ListRow({
  title,
  subtitle,
  leftElement,
  rightElement,
  selected = false,
  onClick,
  className,
}: ListRowProps) {
  const isInteractive = Boolean(onClick)

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'flex min-h-[56px] items-center justify-between border-b border-border py-3 px-4 transition-colors duration-150 motion-reduce:transition-none last:border-b-0',
        selected
          ? 'bg-primary-soft text-primary-ink'
          : 'bg-surface text-text',
        isInteractive &&
          'cursor-pointer hover:bg-primary-soft/20 active:bg-primary-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leftElement && <div className="shrink-0">{leftElement}</div>}
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              'text-sm font-medium truncate',
              selected ? 'text-primary-ink' : 'text-text',
            )}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className={cn(
                'text-xs truncate',
                selected ? 'text-primary-ink/80' : 'text-text-muted',
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {selected ? (
          <Check size={18} className="text-primary-ink" strokeWidth={2} />
        ) : rightElement ? (
          rightElement
        ) : isInteractive ? (
          <ChevronRight size={18} className="text-text-muted" strokeWidth={1.75} />
        ) : null}
      </div>
    </div>
  )
}
