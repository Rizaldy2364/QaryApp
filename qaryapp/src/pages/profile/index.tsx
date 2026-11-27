import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  Cloud,
  CloudOff,
  FileText,
  LogOut,
  MapPin,
  RefreshCw,
  Share2,
  User,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { TextField } from '../../components/ui/TextField'
import { useSettings } from '../../features/settings/useSettings'
import { useTheme } from '../../app/theme-context'
import { getSurahDetail } from '../../features/quran/api'
import { useAuth } from '../../features/auth/useAuth'
import {
  getAvatarInitials,
  getProfileAvatar,
  removeProfileAvatar,
  resizeAvatarImage,
  saveProfileAvatar,
} from '../../features/auth/avatar'
import { useSync } from '../../features/sync/useSync'
import { ApiError } from '../../lib/api-client'
import {
  clearLocalBookmarksAndFavorites,
  clearSyncState,
  isRestrictedStorage,
} from '../../lib/storage'
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
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const { theme, setTheme } = useTheme()
  const {
    user,
    isAuthenticated,
    logout,
    deleteAccount,
    isLoggingOut,
    isDeletingAccount,
  } = useAuth()
  const { status: syncStatus, syncNow } = useSync()

  // Teks pratinjau Arab dari Surah Al-Fatihah ayat 1 (diambil lewat getSurahDetail cache-first)
  const [previewArabic, setPreviewArabic] = useState<string | null>(null)
  const [shareAnnouncement, setShareAnnouncement] = useState('')

  // Foto profil lokal
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarVersion, setAvatarVersion] = useState(0)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarUrl = user?.id && avatarVersion >= 0 ? getProfileAvatar(user.id) : null

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return

    setAvatarError(null)
    try {
      const dataUrl = await resizeAvatarImage(file)
      const saved = saveProfileAvatar(user.id, dataUrl)
      if (!saved) {
        setAvatarError('Penyimpanan perangkat penuh atau dibatasi')
        return
      }
      setAvatarVersion((v) => v + 1)
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : 'Gagal mengganti foto profil',
      )
    }
  }

  const handleRemoveAvatar = () => {
    if (!user?.id) return
    removeProfileAvatar(user.id)
    setAvatarVersion((v) => v + 1)
    setAvatarError(null)
  }

  // Dialog Keluar
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [clearLocalOnLogout, setClearLocalOnLogout] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  // Dialog Hapus Akun
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    getSurahDetail(1)
      .then((res) => {
        if (!ignore && res.surah.ayahs && res.surah.ayahs.length > 0) {
          setPreviewArabic(res.surah.ayahs[0].arabicText)
        }
      })
      .catch(() => {
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

  const handleShareApp = async () => {
    const url = window.location.origin
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'QaryApp',
          text: 'Aplikasi Al-Qur\'an, Jadwal Sholat, Doa Harian, dan Dzikir tanpa iklan.',
          url,
        })
        return
      } catch {
        // Jika pengguna membatalkan share sheet atau gagal, abaikan / fallback ke salin tautan
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url)
        setShareAnnouncement('Tautan disalin')
        window.setTimeout(() => setShareAnnouncement(''), 3000)
      } catch {
        setShareAnnouncement('Gagal menyalin tautan')
      }
    }
  }

  const handleConfirmLogout = async () => {
    setLogoutError(null)
    try {
      await logout()
      await clearSyncState()
      if (clearLocalOnLogout) {
        await clearLocalBookmarksAndFavorites()
      }
      setIsLogoutDialogOpen(false)
      setClearLocalOnLogout(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setLogoutError(err.message)
      } else {
        setLogoutError('Gagal keluar dari akun, silakan coba lagi')
      }
    }
  }

  const handleConfirmDeleteAccount = async () => {
    setDeleteError(null)
    if (!deletePassword) {
      setDeleteError('Kata sandi wajib diisi untuk menghapus akun')
      return
    }
    try {
      await deleteAccount(deletePassword)
      await clearSyncState()
      setIsDeleteDialogOpen(false)
      setDeletePassword('')
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message)
      } else {
        setDeleteError('Gagal menghapus akun, silakan coba lagi')
      }
    }
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

  const renderSyncStatus = () => {
    if (syncStatus === 'syncing') {
      return (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary-ink">
          <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none shrink-0" />
          <span>Menyinkronkan…</span>
        </div>
      )
    }
    if (syncStatus === 'waiting') {
      return (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
          <span>Menunggu koneksi</span>
        </div>
      )
    }
    if (syncStatus === 'error') {
      return (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Gagal menyinkronkan ·</span>
          <button
            type="button"
            onClick={() => void syncNow()}
            className="font-medium underline hover:opacity-80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Coba lagi
          </button>
        </div>
      )
    }
    if (syncStatus === 'expired') {
      return (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Sesi berakhir ·</span>
          <Link
            to="/masuk"
            className="font-medium underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Masuk kembali
          </Link>
        </div>
      )
    }
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary-ink">
        <Cloud className="h-3.5 w-3.5 shrink-0" />
        <span>Bookmark tersinkron</span>
      </div>
    )
  }

  return (
    <div className="pb-24 lg:pb-8">
      <Header title="Profil" />

      {/* Live region untuk pengumuman salin tautan */}
      <div className="sr-only" role="status" aria-live="polite">
        {shareAnnouncement}
      </div>

      <div className="mx-auto max-w-[720px] px-4 pt-4 space-y-6">
        {/* KARTU AKUN */}
        {isAuthenticated && user ? (
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="sr-only"
                aria-label="Pilih foto profil"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Ganti foto profil"
                className="relative flex h-14 w-14 min-h-[56px] min-w-[56px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg text-lg font-semibold cursor-pointer hover:opacity-95 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto profil"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span>{getAvatarInitials(user.displayName, user.email)}</span>
                )}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-text border border-border shadow-xs"
                >
                  <Camera className="h-3 w-3" />
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-text truncate">
                  {user.displayName?.trim() || user.email.split('@')[0]}
                </h2>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
                {renderSyncStatus()}
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="font-medium text-primary-ink hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    Ganti foto
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="font-medium text-text-muted hover:text-danger hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      Hapus foto
                    </button>
                  )}
                </div>
              </div>
            </div>
            {avatarError && (
              <p role="alert" className="mt-3 text-xs text-danger">
                {avatarError}
              </p>
            )}
          </Card>
        ) : (
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary-soft text-primary">
                <User className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-text">Belum masuk</h2>
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
                onClick={() => navigate('/masuk')}
                className="flex-1"
              >
                Masuk
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/daftar')}
                className="flex-1"
              >
                Daftar
              </Button>
            </div>

            <p className="text-[11px] text-center text-text-muted">
              Anda dapat memakai semua fitur sebagai tamu.
            </p>
          </Card>
        )}

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

        {/* TAUTAN INFORMASI & BAGIKAN */}
        <section aria-label="Informasi Aplikasi" className="space-y-3">
          {isAuthenticated && (
            <Card className="p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => void handleShareApp()}
                className="flex w-full min-h-[56px] items-center justify-between p-4 text-left transition-colors hover:bg-primary-soft/20 active:bg-primary-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="h-5 w-5 text-text-muted shrink-0" />
                  <div>
                    <span className="block text-sm font-medium text-text">
                      Bagikan aplikasi
                    </span>
                    <span className="text-xs text-text-muted">
                      {shareAnnouncement || 'Kirim tautan web'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
              </button>
            </Card>
          )}

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

          {/* Aksi Akun Saat Sudah Masuk */}
          {isAuthenticated && (
            <div className="pt-2 space-y-3">
              <Button
                variant="danger"
                size="lg"
                fullWidth
                icon={<LogOut className="h-4 w-4" />}
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                Keluar
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setDeletePassword('')
                    setDeleteError(null)
                    setIsDeleteDialogOpen(true)
                  }}
                  className="min-h-[44px] px-4 text-xs font-medium text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded-lg cursor-pointer"
                >
                  Hapus akun
                </button>
              </div>
            </div>
          )}

          {/* Nomor Versi Aplikasi */}
          <div className="pt-2 text-center">
            <p className="text-xs text-text-muted font-mono">
              QaryApp v{appVersion}
            </p>
          </div>
        </section>
      </div>

      {/* DIALOG KONFIRMASI KELUAR */}
      {isLogoutDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <Card className="w-full max-w-sm p-5 shadow-xl space-y-4">
            <h3 id="logout-dialog-title" className="text-base font-semibold text-text">
              Keluar dari akun?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Sinkronisasi akan berhenti. Data Anda di server tetap aman untuk masuk kembali nanti.
            </p>

            <label className="flex items-start gap-2.5 text-xs text-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={clearLocalOnLogout}
                onChange={(e) => setClearLocalOnLogout(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span>Hapus juga bookmark dan favorit dari perangkat ini</span>
            </label>

            {logoutError && (
              <p role="alert" className="text-xs text-danger">
                {logoutError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
                disabled={isLoggingOut}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleConfirmLogout()}
                loading={isLoggingOut}
                disabled={isLoggingOut}
                className="flex-1"
              >
                Keluar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* DIALOG HAPUS AKUN */}
      {isDeleteDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <Card className="w-full max-w-sm p-5 shadow-xl space-y-4">
            <h3 id="delete-account-title" className="text-base font-semibold text-danger">
              Hapus akun permanen?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Akun dan seluruh data tersinkron di server akan dihapus permanen. Bookmark dan
              catatan di perangkat ini tetap ada.
            </p>

            <TextField
              label="Masukkan kata sandi untuk konfirmasi"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              error={deleteError ?? undefined}
              disabled={isDeletingAccount}
            />

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeletingAccount}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleConfirmDeleteAccount()}
                loading={isDeletingAccount}
                disabled={isDeletingAccount}
                className="flex-1"
              >
                Hapus akun
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
export default ProfilePage
