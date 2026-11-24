import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type BadgeVariant = 'next' | 'saved' | 'default'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
}

export function Badge({
  children,
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  const variantStyles = {
    next: 'bg-primary-soft text-primary-ink font-medium',
    saved: 'bg-surface border border-border text-text-muted font-normal',
    default: 'bg-primary-soft/50 text-text font-normal',
  }[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] leading-tight',
        variantStyles,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
