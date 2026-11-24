import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  selected?: boolean
}

export function Chip({
  children,
  selected = false,
  className,
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-8 min-h-[32px] items-center justify-center rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected
          ? 'bg-primary-soft text-primary-ink'
          : 'bg-surface border border-border text-text hover:bg-primary-soft/20 active:bg-primary-soft/40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
