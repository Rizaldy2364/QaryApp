import type { InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function SearchField({
  label,
  value,
  onChange,
  placeholder = 'Cari...',
  className,
  id = 'search-field-input',
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn('relative flex w-full items-center', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="pointer-events-none absolute left-3 flex items-center justify-center text-text-muted">
        <Search size={18} strokeWidth={1.75} />
      </div>
      <input
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-4 text-sm text-text placeholder:text-text-muted transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
        {...props}
      />
    </div>
  )
}
