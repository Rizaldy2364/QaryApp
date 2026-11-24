// TODO: Halaman ini dibuat sesuai Tugas B (belum ada artboard desain resmi di desain.md).
// Mengikuti pola Card, ListRow, dan token warna yang konsisten dengan desain sistem QaryApp.
import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { usePageTitle } from '../../lib/usePageTitle'
import licensesData from '../../data/licenses.json'

interface LicenseItem {
  id: string
  name: string
  usage: string
  licenseName: string
  sourceUrl: string
  attribution: string
  isApi: boolean
  licenseText: string
}

export function DataSourcesPage() {
  usePageTitle('Sumber Data & Lisensi')
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="pb-16">
      <Header
        title="Sumber data dan lisensi"
        showBack={true}
      />

      <div className="mx-auto max-w-[720px] px-4 pt-4">
        <p className="mb-4 text-xs leading-relaxed text-text-muted">
          QaryApp dibangun menggunakan sumber data terbuka, layanan API publik, serta aset tipografi dan ikon berlisensi resmi. Berikut adalah rincian atribusi dan ketentuan penggunaan dari masing-masing penyedia.
        </p>

        <div className="space-y-4">
          {(licensesData as LicenseItem[]).map((item) => {
            const isOpen = openIds.has(item.id)

            return (
              <Card key={item.id} className="p-4 transition-all">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-text">
                        {item.name}
                      </h2>
                      <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary-ink">
                        {item.licenseName}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-text-muted leading-relaxed">
                      {item.usage}
                    </p>
                  </div>

                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-muted hover:bg-primary-soft/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer"
                    aria-label={`Buka situs resmi ${item.name} di tab baru`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Seksi Atribusi Wajib */}
                {item.attribution && (
                  <div className="mt-3 rounded-lg border border-border bg-bg/50 p-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text uppercase tracking-wider mb-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      <span>Atribusi Sumber</span>
                    </div>
                    <p className="text-xs font-mono text-text-muted leading-relaxed break-words">
                      {item.attribution}
                    </p>
                  </div>
                )}

                {/* Tombol Aksesibel Buka/Tutup Lisensi */}
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`license-content-${item.id}`}
                    onClick={() => toggleOpen(item.id)}
                    className="flex min-h-[44px] w-full items-center justify-between py-2 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md cursor-pointer"
                  >
                    <span>{isOpen ? 'Sembunyikan teks lisensi' : 'Lihat teks lisensi lengkap'}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                  </button>

                  {/* Isi Teks Lisensi Terbuka */}
                  {isOpen && (
                    <div
                      id={`license-content-${item.id}`}
                      className="mt-2 rounded-lg bg-bg p-3 border border-border overflow-x-auto"
                    >
                      <pre className="font-mono text-[11px] leading-relaxed text-text-muted whitespace-pre-wrap select-text">
                        {item.licenseText}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default DataSourcesPage
