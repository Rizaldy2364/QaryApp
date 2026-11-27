import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AlertCircle, ArrowLeft, Lock, Mail, User } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { useAuth } from '../../features/auth/useAuth'
import { ApiError } from '../../lib/api-client'
import { usePageTitle } from '../../lib/usePageTitle'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  usePageTitle('Daftar')
  const navigate = useNavigate()
  const { isAuthenticated, register, isRegistering } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})
  const [formError, setFormError] = useState<string | null>(null)

  if (isAuthenticated) {
    return <Navigate to="/profil" replace />
  }

  const handleBack = () => {
    if (
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1)
    } else {
      navigate('/profil', { replace: true })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const nextErrors: {
      displayName?: string
      email?: string
      password?: string
      confirmPassword?: string
    } = {}
    const trimmedName = displayName.trim()
    const trimmedEmail = email.trim()

    if (trimmedName.length > 80) {
      nextErrors.displayName = 'Nama maksimal 80 karakter'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Email wajib diisi'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Format email tidak valid'
    }

    if (!password) {
      nextErrors.password = 'Kata sandi wajib diisi'
    } else if (password.length < 8 || password.length > 128) {
      nextErrors.password = 'Kata sandi harus terdiri dari 8 sampai 128 karakter'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Konfirmasi kata sandi wajib diisi'
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok'
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await register({
        email: trimmedEmail,
        password,
        displayName: trimmedName || undefined,
      })
      navigate('/masuk', {
        replace: true,
        state: { registeredEmail: trimmedEmail },
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message)
      } else {
        setFormError('Gagal membuat akun, silakan coba lagi')
      }
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text flex flex-col">
      {/* Ornamen sudut kanan atas bernuansa QaryApp */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 -right-6 h-36 w-36 text-primary/15"
        viewBox="0 0 120 120"
      >
        <circle cx="80" cy="40" r="46" fill="currentColor" />
        <path
          d="M78 24a18 18 0 1 0 18 18 14 14 0 1 1-18-18z"
          fill="var(--color-gold)"
          opacity="0.7"
        />
      </svg>

      {/* Baris tombol kembali */}
      <div className="relative z-10 mx-auto w-full max-w-[440px] px-5 pt-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Kembali"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface border border-border text-text hover:bg-primary-soft/40 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Konten Form Daftar */}
      <div className="relative z-10 mx-auto w-full max-w-[440px] flex-1 px-6 pt-3 pb-10 flex flex-col justify-between">
        <div>
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-primary-ink dark:text-primary">
              Daftar Akun
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Buat akun QaryApp baru Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div aria-live="polite" aria-atomic="true">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-danger-soft p-3 text-xs text-danger"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <TextField
              label="Nama (opsional)"
              hideLabel
              type="text"
              autoComplete="name"
              placeholder="Nama lengkap (opsional)"
              leftIcon={<User className="h-4 w-4" />}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={fieldErrors.displayName}
              disabled={isRegistering}
            />

            <TextField
              label="Email"
              hideLabel
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nama@contoh.com"
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={isRegistering}
            />

            <TextField
              label="Kata sandi"
              hideLabel
              type="password"
              autoComplete="new-password"
              placeholder="Kata sandi"
              helperText="Minimal 8 sampai 128 karakter"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              disabled={isRegistering}
            />

            <TextField
              label="Konfirmasi kata sandi"
              hideLabel
              type="password"
              autoComplete="new-password"
              placeholder="Konfirmasi kata sandi"
              leftIcon={<Lock className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
              disabled={isRegistering}
            />

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isRegistering}
                disabled={isRegistering}
                className="rounded-full font-semibold"
              >
                Daftar
              </Button>
            </div>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-text-muted">
            Kami hanya menyimpan email, nama (opsional), dan data yang Anda sinkronkan:
            bookmark, doa favorit, dan posisi baca. Lokasi dan catatan sholat tetap di
            perangkat Anda.
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-text-muted">
          Sudah punya akun?{' '}
          <Link
            to="/masuk"
            className="font-semibold text-primary-ink underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
