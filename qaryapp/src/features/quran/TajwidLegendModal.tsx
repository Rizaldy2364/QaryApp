import { useEffect } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '../../components/ui/IconButton'
import { TAJWID_RULES } from './tajwid'
import { cn } from '../../lib/utils'

interface TajwidLegendModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TajwidLegendModal({ isOpen, onClose }: TajwidLegendModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tajwid-legend-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[520px] max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="tajwid-legend-title"
              className="text-base font-semibold text-text"
            >
              Panduan Warna Tajwid
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Arti warna hukum bacaan pada teks ayat Al-Qur&apos;an
            </p>
          </div>
          <IconButton
            label="Tutup panduan tajwid"
            icon={<X className="h-5 w-5" />}
            onClick={onClose}
          />
        </div>

        <div className="overflow-y-auto p-5 space-y-3">
          {TAJWID_RULES.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-border/80 bg-bg/60 p-3"
            >
              <span
                aria-hidden="true"
                className={cn('mt-1 h-4 w-4 shrink-0 rounded-full', item.swatchClass)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-sm font-semibold', item.textClass)}>
                    {item.label}
                  </span>
                  <span
                    dir="rtl"
                    lang="ar"
                    className={cn('font-arab text-lg leading-none', item.textClass)}
                  >
                    {item.example}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
