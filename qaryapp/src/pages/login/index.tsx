import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { useAuth } from '../../features/auth/useAuth'
import { useSync } from '../../features/sync/useSync'
import { ApiError } from '../../lib/api-client'
import { usePageTitle } from '../../lib/usePageTitle'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LoginLocationState {
  registeredEmail?: string
}

export function LoginPage() {
  usePageTitle('Masuk')
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as LoginLocationState | null) ?? null
  const registeredEmail = locationState?.registeredEmail
  const { isAuthenticated, login, isLoggingIn } = useAuth()
  const { runInitialSync } = useSync()

  const [email, setEmail] = useState(registeredEmail ?? '')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
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

    const nextErrors: { email?: string; password?: string } = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      nextErrors.email = 'Email wajib diisi'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Format email tidak valid'
    }

    if (!password) {
      nextErrors.password = 'Kata sandi wajib diisi'
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await login({ email: trimmedEmail, password })
      void runInitialSync()
      handleBack()
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message)
      } else {
        setFormError('Gagal masuk ke akun, silakan coba lagi')
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Bagian Atas Melengkung dengan Latar Hijau QaryApp */}
      <div className="relative w-full overflow-hidden bg-[linear-gradient(180deg,var(--art-green)_0%,var(--art-green-dark)_100%)] text-white pt-4 pb-16">
        {/* Ornamen pola geometris tipis */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-15"
          viewBox="0 0 390 220"
          preserveAspectRatio="xMidYMid slice"
        >
          <circle cx="310" cy="48" r="70" fill="none" stroke="var(--art-gold)" strokeWidth="1" />
          <circle cx="80" cy="140" r="95" fill="none" stroke="var(--art-gold)" strokeWidth="1" />
          <circle cx="290" cy="60" r="2" fill="var(--art-gold)" />
          <circle cx="110" cy="40" r="1.5" fill="var(--art-cream)" />
        </svg>

        <div className="relative z-10 mx-auto max-w-[480px] px-4">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Kembali"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="mt-2 mb-4 flex flex-col items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 p-1.5 ring-1 ring-white/25 backdrop-blur-xs shadow-md">
              <img
                src="/qaryapp-icon.svg"
                alt="QaryApp"
                width={52}
                height={52}
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>

        {/* Lekukan gelombang bawah transisi mulus ke warna latar halaman */}
        <svg
          aria-hidden="true"
          viewBox="0 0 390 48"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-11 w-full"
        >
          <path
            d="M0,12 C110,48 250,42 390,0 L390,48 L0,48 Z"
            fill="var(--color-bg)"
          />
        </svg>
      </div>

      {/* Konten Form Masuk */}
      <div className="mx-auto w-full max-w-[440px] flex-1 px-6 pt-3 pb-10 flex flex-col justify-between">
        <div>
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-primary-ink dark:text-primary">
              Selamat Datang
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Masuk ke akun QaryApp Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div aria-live="polite" aria-atomic="true">
              {formError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-danger-soft p-3 text-xs text-danger"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              ) : (
                registeredEmail && (
                  <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-xl bg-primary-soft p-3 text-xs text-primary-ink dark:text-primary"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi Anda.</span>
                  </div>
                )
              )}
            </div>

            <TextField
              label="Email"
              hideLabel
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Masukkan email"
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={isLoggingIn}
            />

            <TextField
              label="Kata sandi"
              hideLabel
              type="password"
              autoComplete="current-password"
              placeholder="Kata sandi"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              disabled={isLoggingIn}
            />

            <div className="flex justify-end">
              <span className="text-xs text-text-muted">
                Pemulihan kata sandi belum tersedia.
              </span>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoggingIn}
                disabled={isLoggingIn}
                className="rounded-full font-semibold"
              >
                Masuk
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-text-muted">
          Belum punya akun?{' '}
          <Link
            to="/daftar"
            className="font-semibold text-primary-ink underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Daftar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
