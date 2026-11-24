import { useState } from 'react'
import {
  Bookmark,
  Heart,
  Moon,
  Search,
  Settings,
  Share2,
  Sun,
  Volume2,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Card } from '../../components/ui/Card'
import { ListRow } from '../../components/ui/ListRow'
import { Chip } from '../../components/ui/Chip'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { SearchField } from '../../components/ui/SearchField'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Switch } from '../../components/ui/Switch'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { OfflineBanner } from '../../components/feedback/OfflineBanner'
import { useTheme } from '../../lib/theme'
import type { ThemeMode } from '../../types'

export default function DevComponentsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('surah')
  const [searchValue, setSearchValue] = useState('')
  const [segmentValue, setSegmentValue] = useState('pagi')
  const [switchChecked, setSwitchChecked] = useState(false)
  const [selectedChip, setSelectedChip] = useState('sholat')
  const [selectedRow, setSelectedRow] = useState(false)
  const [forceOfflineBanner, setForceOfflineBanner] = useState(false)

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header
        title="Pratinjau Komponen"
        subtitle="Hanya tersedia di mode pengembang"
        showBack={true}
      />

      {forceOfflineBanner && (
        <div className="flex h-7 w-full items-center justify-center gap-2 bg-text px-4 text-xs text-bg">
          <span>Pratinjau Mode Offline • Terakhir diperbarui 08:30</span>
        </div>
      )}
      <OfflineBanner lastUpdated="08:30" />

      <div className="mx-auto max-w-[720px] space-y-8 p-4">
        {/* Kontrol Tema */}
        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">Pilihan Tema</h2>
          <div className="flex flex-wrap gap-2">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <Button
                key={mode}
                size="md"
                variant={theme === mode ? 'primary' : 'outline'}
                onClick={() => setTheme(mode)}
              >
                {mode === 'light' && <Sun size={16} className="mr-1" />}
                {mode === 'dark' && <Moon size={16} className="mr-1" />}
                {mode === 'system' && <Settings size={16} className="mr-1" />}
                {mode === 'light' ? 'Terang' : mode === 'dark' ? 'Gelap' : 'Sistem'}
              </Button>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            Tema aktif: <span className="font-semibold text-text">{resolvedTheme}</span> (pilihan: {theme})
          </p>
        </section>

        {/* Tombol (Buttons) */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-text">Tombol (Button)</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Utama (44px)</Button>
            <Button variant="outline">Garis</Button>
            <Button variant="danger">Bahaya</Button>
            <Button variant="text">Teks</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="primary">
              Ukuran Besar (48px)
            </Button>
            <Button variant="primary" icon={<Volume2 size={18} />}>
              Dengan Ikon
            </Button>
            <Button variant="primary" loading>
              Memuat
            </Button>
            <Button variant="primary" disabled>
              Nonaktif
            </Button>
          </div>
          <Button variant="primary" fullWidth>
            Lebar Penuh (Full Width)
          </Button>
        </section>

        {/* Tombol Ikon (IconButton) */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text">Tombol Ikon (IconButton)</h2>
          <div className="flex items-center gap-3">
            <IconButton
              label="Simpan favorit"
              variant="ghost"
              icon={<Bookmark size={20} />}
            />
            <IconButton
              label="Suka"
              variant="surface"
              icon={<Heart size={20} />}
            />
            <IconButton
              label="Bagikan"
              variant="primary"
              icon={<Share2 size={20} />}
            />
            <IconButton
              label="Nonaktif"
              disabled
              icon={<Settings size={20} />}
            />
          </div>
        </section>

        {/* Kartu (Card) */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text">Kartu (Card)</h2>
          <Card>
            <h3 className="font-semibold text-text">Kartu Standar</h3>
            <p className="text-sm text-text-muted mt-1">
              Kartu dengan border 1px dan sudut 12px tanpa bayangan.
            </p>
          </Card>
          <Card interactive onClick={() => alert('Kartu interaktif ditekan')}>
            <h3 className="font-semibold text-text">Kartu Interaktif</h3>
            <p className="text-sm text-text-muted mt-1">
              Dapat ditekan dan memiliki sorotan halus saat disentuh.
            </p>
          </Card>
        </section>

        {/* Baris Daftar (ListRow) */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text">Baris Daftar (ListRow)</h2>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <ListRow
              title="Al-Fatihah"
              subtitle="Pembukaan • 7 Ayat"
              onClick={() => {}}
            />
            <ListRow
              title="Al-Baqarah"
              subtitle="Sapi Betina • 286 Ayat"
              selected={selectedRow}
              onClick={() => setSelectedRow(!selectedRow)}
            />
            <ListRow
              title="Ali 'Imran"
              subtitle="Keluarga Imran • 200 Ayat"
              rightElement={<Badge variant="next">Berikutnya</Badge>}
            />
          </div>
        </section>

        {/* Chip & Badge */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text">Chip & Lencana (Badge)</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <Chip
              selected={selectedChip === 'sholat'}
              onClick={() => setSelectedChip('sholat')}
            >
              Sholat
            </Chip>
            <Chip
              selected={selectedChip === 'doa'}
              onClick={() => setSelectedChip('doa')}
            >
              Doa Harian
            </Chip>
            <Chip
              selected={selectedChip === 'dzikir'}
              onClick={() => setSelectedChip('dzikir')}
            >
              Dzikir
            </Chip>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="next">Berikutnya</Badge>
            <Badge variant="saved">Data tersimpan</Badge>
            <Badge variant="default">Keterangan</Badge>
          </div>
        </section>

        {/* Input & Kontrol */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-text">Input & Kontrol</h2>
          <SearchField
            label="Cari surah atau doa"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Cari surah, ayat, atau doa..."
          />

          <SegmentedControl
            value={segmentValue}
            onChange={setSegmentValue}
            options={[
              { value: 'pagi', label: 'Dzikir Pagi' },
              { value: 'petang', label: 'Dzikir Petang' },
            ]}
          />

          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'surah', label: 'Surah' },
              { id: 'juz', label: 'Juz' },
              { id: 'doa', label: 'Doa' },
            ]}
          />

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <span className="text-sm font-medium text-text">
              Saklar Pengaturan (Switch)
            </span>
            <Switch
              label="Aktifkan notifikasi"
              checked={switchChecked}
              onChange={setSwitchChecked}
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs text-text-muted">Bilah Kemajuan (45%)</span>
            <ProgressBar value={45} />
          </div>
        </section>

        {/* Keadaan Umpan Balik (Feedback States) */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-text">Umpan Balik (Feedback)</h2>

          {/* Skeleton */}
          <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
            <span className="text-xs text-text-muted">Kerangka Memuat (Skeleton)</span>
            <Skeleton height={20} width="60%" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="40%" />
          </div>

          {/* EmptyState */}
          <div className="rounded-xl border border-border bg-surface">
            <EmptyState
              icon={<Search size={32} />}
              title="Belum Ada Ayat Tersimpan"
              description="Tandai ayat favorit Anda saat membaca Al-Qur'an untuk melihatnya di sini."
              action={
                <Button variant="primary">Buka Al-Qur'an</Button>
              }
            />
          </div>

          {/* ErrorState */}
          <div className="rounded-xl border border-border bg-surface">
            <ErrorState
              title="Jadwal Sholat Gagal Dimuat"
              description="Tidak dapat terhubung ke server jadwal sholat. Silakan periksa jaringan internet Anda."
              onRetry={() => alert('Mencoba memuat ulang data...')}
            />
          </div>

          {/* Banner offline preview toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <span className="text-sm font-medium text-text">
              Uji Coba Tampilan Banner Offline
            </span>
            <Button
              variant="outline"
              size="md"
              onClick={() => setForceOfflineBanner(!forceOfflineBanner)}
            >
              {forceOfflineBanner ? 'Sembunyikan Banner' : 'Tampilkan Banner'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
