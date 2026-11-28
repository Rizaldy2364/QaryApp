import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTab),
  )

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'relative flex h-11 w-full border-b border-border bg-surface',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex flex-1 items-center justify-center text-sm transition-colors duration-200 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive
                ? 'font-semibold text-primary'
                : 'text-text-muted hover:text-text',
            )}
          >
            {tab.icon && (
              <span className="mr-2 inline-flex shrink-0">{tab.icon}</span>
            )}
            {tab.label}
          </button>
        )
      })}
      {tabs.length > 0 && (
        <span
          aria-hidden="true"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none"
        />
      )}
    </div>
  )
}
