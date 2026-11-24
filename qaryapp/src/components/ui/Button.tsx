import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'text'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-[10px] cursor-pointer transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

  const sizeStyles = {
    md: 'min-h-[44px] h-11 px-4 text-sm',
    lg: 'min-h-[48px] h-12 px-6 text-sm',
  }[size]

  const variantStyles = {
    primary:
      'bg-primary text-primary-fg hover:opacity-95 active:opacity-85',
    outline:
      'border border-primary text-primary-ink bg-transparent hover:bg-primary-soft/40 active:bg-primary-soft/60',
    danger:
      'border border-danger text-danger bg-transparent hover:bg-danger/10 active:bg-danger/20',
    text: 'text-primary-ink bg-transparent hover:bg-primary-soft/30 active:bg-primary-soft/50',
  }[variant]

  const widthStyle = fullWidth ? 'w-full' : ''
  const disabledStyle = isDisabled ? 'opacity-50 pointer-events-none' : ''

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        baseStyles,
        sizeStyles,
        variantStyles,
        widthStyle,
        disabledStyle,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          role="status"
          aria-label="Memuat"
        />
      ) : icon ? (
        <span className="mr-2 flex items-center">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
