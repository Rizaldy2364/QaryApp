import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type IconButtonVariant = 'ghost' | 'surface' | 'primary'

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  variant?: IconButtonVariant
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  disabled = false,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  const baseStyles =
    'flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] cursor-pointer transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

  const variantStyles = {
    ghost:
      'text-text hover:bg-primary-soft/40 active:bg-primary-soft/60',
    surface:
      'bg-surface border border-border text-text hover:bg-primary-soft/40 active:bg-primary-soft/60',
    primary:
      'bg-primary text-primary-fg hover:opacity-95 active:opacity-85',
  }[variant]

  const disabledStyle = disabled ? 'opacity-50 pointer-events-none' : ''

  return (
    <button
      type={type}
      aria-label={label}
      disabled={disabled}
      className={cn(baseStyles, variantStyles, disabledStyle, className)}
      {...props}
    >
      {icon}
    </button>
  )
}
