import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hideLabel?: boolean
  leftIcon?: ReactNode
  helperText?: string
  error?: string
  id?: string
}

export function TextField({
  label,
  hideLabel = false,
  leftIcon,
  helperText,
  error,
  type = 'text',
  id,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const effectiveType = isPassword && showPassword ? 'text' : type

  const describedByIds: string[] = []
  if (helperText) describedByIds.push(helperId)
  if (error) describedByIds.push(errorId)

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className={
          hideLabel
            ? 'sr-only'
            : 'block text-sm font-medium text-text'
        }
      >
        {label}
      </label>

      <div className="relative">
        {leftIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-text-muted"
          >
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          type={effectiveType}
          aria-invalid={Boolean(error)}
          aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
          className={cn(
            'w-full min-h-[44px] h-12 rounded-xl border bg-surface text-sm text-text placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
            leftIcon ? 'pl-11' : 'px-3.5',
            isPassword ? 'pr-12' : 'pr-3.5',
            error ? 'border-danger focus:ring-danger' : 'border-border',
            className,
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>

      {helperText && (
        <p id={helperId} className="text-xs leading-4 text-text-muted px-1">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs leading-4 text-danger font-medium px-1">
          {error}
        </p>
      )}
    </div>
  )
}
