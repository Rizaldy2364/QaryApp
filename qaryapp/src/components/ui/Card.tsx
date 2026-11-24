import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
}

export function Card({
  children,
  interactive = false,
  className,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-xl border border-border bg-surface p-4 shadow-none'
  const interactiveStyles = interactive
    ? 'cursor-pointer transition-colors duration-150 motion-reduce:transition-none hover:bg-primary-soft/20 active:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
    : ''

  return (
    <div
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      className={cn(baseStyles, interactiveStyles, className)}
      {...props}
    >
      {children}
    </div>
  )
}
