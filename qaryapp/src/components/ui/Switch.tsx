import { cn } from '../../lib/utils'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
  id?: string
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  className,
  id = 'switch-toggle',
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[26px] w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        checked ? 'bg-primary' : 'bg-border',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-150 motion-reduce:transition-none',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}
