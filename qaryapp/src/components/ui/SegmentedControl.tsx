import { cn } from '../../lib/utils'

export interface SegmentOption<T extends string = string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'flex h-10 w-full items-center rounded-[10px] border border-border bg-surface p-1',
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-1 h-full items-center justify-center rounded-[8px] text-xs transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isSelected
                ? 'bg-primary-soft text-primary-ink font-medium'
                : 'text-text-muted hover:text-text',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
