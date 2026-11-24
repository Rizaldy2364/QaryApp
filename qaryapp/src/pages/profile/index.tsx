import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { User, ChevronRight, MapPin, FileText } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useSettings } from '../../features/settings/useSettings'
import { useTheme } from '../../app/theme-context'
import { getSurahDetail } from '../../features/quran/api'
import { isRestrictedStorage } from '../../lib/storage'
import { usePageTitle } from '../../lib/usePageTitle'
import type { ArabSize, ThemeMode } from '../../types'

const themeOptions = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'system', label: 'Ikut sistem' },
]

const arabSizeOptions = [
  { value: 'small', label: 'Kecil' },
  { value: 'medium', label: 'Sedang' },
  { value: 'large', label: 'Besar' },
]

export function ProfilePage() {
  usePageTitle('Profil')
  const { settings, updateSettings } = useSettings()
  const { theme, setTheme } = useTheme()

  // Teks pratinjau Arab dari Surah Al-Fatihah ayat 1 (diambil lewat getSurahDetail cache-first)
  const [previewArabic, setPreviewArabic] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    getSurahDetail(1)
      .then((res) => {
        if (!ignore && res.surah.ayahs && res.surah.ayahs.length > 0) {
          setPreviewArabic(res.surah.ayahs[0].arabicText)
        }
      })
      .catch(() => {
        // Jika offline dan belum di-cache, pratinjau disembunyikan
        if (!ignore) setPreviewArabic(null)
      })
    return () => {
      ignore = true
    }
  }, [])

  const handleThemeChange = (newTheme: string) => {
    const mode = newTheme as ThemeMode
    setTheme(mode)
    updateSettings({ theme: mode })
  }

  const handleArabSizeChange = (newSize: string) => {
    updateSettings({ arabSize: newSize as ArabSize })
  }

  // Kelas gaya ukuran teks Arab untuk pratinjau
  const previewSizeClass = {
    small: 'text-xl leading-[2.0]',
    medium: 'text-2xl leading-[2.0]',
    large: 'text-3xl leading-[2.0]',
  }[settings.arabSize]

  const locationDisplay = settings.location
    ? `${settings.location.city}, ${settings.location.country}`
    : 'Belum diatur'

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

  return (
    <div className="pb-24 lg:pb-8">
      <Header title="Profil" />

      <div className="mx-auto max-w-[720px] px-4 pt-4 space-y-6">
        {/* KARTU AKUN (TAMU) */}
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary-soft text-primary">
              <User className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text">Belum masuk</h2>
                <Badge variant="default">Segera hadir</Badge>
                {isRestrictedStorage() && (
                  <Badge variant="saved">Penyimpanan terbatas</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted leading-relaxed">
                Masuk untuk mengamankan bookmark dan menyinkronkannya antar perangkat.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-border/60">
            <Button
              variant="primary"
              disabled={true}
              aria-disabled={true}
              className="flex-1"
            >
              Masuk
            </Button>
            <Button
              variant="outline"
              disabled={true}
              aria-disabled={true}
              className="flex-1"
            >
              Daftar
            </Button>
          </div>

          <p className="text-[11px] text-center text-text-muted">
            Anda dapat memakai semua fitur sebagai tamu.
          </p>
        </Card>

        {/* SEKSI PENGATURAN */}
        <section aria-label="Pengaturan Aplikasi">
          <h2 className="mb-3 text-[13px] leading-5 font-semibold text-text uppercase tracking-wider">
            Pengaturan
          </h2>

          <Card className="divide-y divide-border p-0 overflow-hidden">
            {/* 1. Pengaturan Tema */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">Tema</span>
              </div>
              <SegmentedControl
                options={themeOptions}
                value={theme}
                onChange={handleThemeChange}
              />
            </div>

            {/* 2. Pengaturan Ukuran Teks Arab */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">Ukuran teks Arab</span>
              </div>
              <SegmentedControl
                options={arabSizeOptions}
                value={settings.arabSize}
                onChange={handleArabSizeChange}
              />

              {/* Pratinjau Teks Arab (Amiri, tinggi baris 2,0, rata tengah) */}
              {previewArabic && (
                <div className="mt-2 rounded-xl bg-bg p-4 border border-border text-center">
                  <p
                    dir="rtl"
                    className={`font-arabic text-text transition-all duration-150 ${previewSizeClass}`}
                  >
                    {previewArabic}
                  </p>
                  <span className="mt-1 block text-[11px] text-text-muted">
                    Pratinjau: QS. Al-Fatihah: 1
                  </span>
                </div>
              )}
            </div>

            {/* 3. Pengaturan Lokasi */}
            <Link
              to="/lokasi"
              className="flex min-h-[56px] items-center justify-between p-4 transition-colors hover:bg-primary-soft/20 active:bg-primary-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-text-muted shrink-0" />
                <div>
                  <span className="block text-sm font-medium text-text">Lokasi</span>
                  <span className="text-xs text-text-muted">{locationDisplay}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
            </Link>
          </Card>
        </section>

        {/* TAUTAN SUMBER DATA & LISENSI */}
        <section aria-label="Informasi Aplikasi">
          <Link
            to="/profil/sumber-data"
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            <Card interactive className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-text-muted shrink-0" />
                <div>
                  <span className="block text-sm font-medium text-text">
                    Sumber data dan lisensi
                  </span>
                  <span className="text-xs text-text-muted">
                    Atribusi penyedia data, font, dan lisensi terbuka
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
            </Card>
          </Link>

          {/* Nomor Versi Aplikasi */}
          <div className="pt-4 text-center">
            <p className="text-xs text-text-muted font-mono">
              QaryApp v{appVersion}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
export default ProfilePage
