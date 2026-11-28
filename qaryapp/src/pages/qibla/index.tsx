import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { MapPin, ChevronDown, AlertTriangle } from 'lucide-react'
import { useSettings } from '../../features/settings/useSettings'
import { useTheme } from '../../lib/theme'
import { usePageTitle } from '../../lib/usePageTitle'
import { useQiblaCompass } from '../../features/qibla/useQiblaCompass'
import {
  calculateQiblaDirection,
  calculateDistanceToKaaba,
} from '../../features/qibla/lib/qibla'
import { cn } from '../../lib/utils'

const QiblaMap = lazy(() => import('../../features/qibla/QiblaMap'))

type QiblaViewMode = 'compass' | 'map'

const VIEW_MODE_OPTIONS: Array<{ value: QiblaViewMode; label: string }> = [
  { value: 'compass', label: 'Kompas' },
  { value: 'map', label: 'Peta' },
]

function QiblaHeaderControls({
  locationName,
  viewMode,
  onChangeViewMode,
  floating = false,
}: {
  locationName: string
  viewMode: QiblaViewMode
  onChangeViewMode: (mode: QiblaViewMode) => void
  floating?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div
        className={cn(
          'flex flex-col items-center',
          floating &&
            'pointer-events-auto rounded-2xl bg-surface/85 dark:bg-[#0E2019]/85 backdrop-blur-md border border-border/80 dark:border-white/15 px-4 py-2 shadow-lg',
        )}
      >
        <h1 className="text-base font-semibold tracking-tight text-text dark:text-white">
          Kiblat
        </h1>
        <Link
          to="/lokasi"
          aria-label="Ubah lokasi saat ini"
          className="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-text-muted dark:text-white/80 hover:bg-surface/80 dark:hover:bg-white/15 hover:text-text dark:hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MapPin size={14} className="text-gold shrink-0" />
          <span className="truncate max-w-[220px]">{locationName}</span>
          <ChevronDown size={14} className="text-text-muted dark:text-white/60 shrink-0" />
        </Link>
      </div>

      <div
        role="radiogroup"
        aria-label="Mode tampilan Kiblat"
        className={cn(
          'pointer-events-auto relative flex h-10 w-full max-w-[240px] items-center rounded-full border p-1 transition-all duration-300 ease-out',
          floating
            ? 'border-border/80 dark:border-white/15 bg-surface/85 dark:bg-[#0E2019]/85 backdrop-blur-md shadow-lg'
            : 'border-border dark:border-white/10 bg-surface dark:bg-white/10 shadow-sm',
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            'absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[#E8C568] shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none',
            viewMode === 'map' ? 'translate-x-full' : 'translate-x-0',
          )}
        />
        {VIEW_MODE_OPTIONS.map((option) => {
          const isSelected = option.value === viewMode
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChangeViewMode(option.value)}
              className={cn(
                'relative z-10 flex flex-1 h-full items-center justify-center rounded-full text-xs transition-colors duration-200 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'text-[#1A1C1A] font-semibold'
                  : 'text-text-muted dark:text-white/70 hover:text-text dark:hover:text-white',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function QiblaPage() {
  usePageTitle('Kiblat')
  const { settings } = useSettings()
  const { resolvedTheme } = useTheme()
  const location = settings.location
  const effectiveMapTheme: 'light' | 'dark' =
    settings.mapTheme === 'system' ? resolvedTheme : settings.mapTheme

  // Koordinat lokasi (fallback Jakarta jika lokasi belum dipilih)
  const userLat = location?.coordinates?.latitude ?? -6.2088
  const userLng = location?.coordinates?.longitude ?? 106.8456
  const locationName = location
    ? `${location.city}, ${location.country}`
    : 'Jakarta, Indonesia'

  // Hitung arah kiblat dan jarak
  const qiblaAngle = useMemo(
    () => calculateQiblaDirection(userLat, userLng),
    [userLat, userLng],
  )
  const distanceKm = useMemo(
    () => calculateDistanceToKaaba(userLat, userLng),
    [userLat, userLng],
  )

  const [viewMode, setViewMode] = useState<QiblaViewMode>('compass')
  const [hasOpenedMap, setHasOpenedMap] = useState(false)

  const handleChangeViewMode = (mode: QiblaViewMode) => {
    if (mode === 'map') setHasOpenedMap(true)
    setViewMode(mode)
  }

  const {
    heading,
    verticalTilt,
    horizontalTilt,
    hasSensor,
    accuracyStatus,
    accuracySource,
  } = useQiblaCompass()

  // Selisih antara arah hadap perangkat dan arah kiblat
  // Ketika difference mendekati 0 atau 360, ponsel tepat menghadap kiblat
  const angleDiff = Math.abs((heading - qiblaAngle + 360) % 360)
  const isAligned = angleDiff <= 3 || angleDiff >= 357

  // Rotasi dial kompas kontinu agar tidak berputar balik 358° saat melewati 0°/360°
  const [rotState, setRotState] = useState({ heading: 0, cumulative: 0 })
  if (rotState.heading !== heading) {
    const delta = ((heading - rotState.heading + 540) % 360) - 180
    setRotState({
      heading,
      cumulative: rotState.cumulative + delta,
    })
  }
  const compassRotation = -rotState.cumulative

  return (
    <div
      className={cn(
        'relative w-full flex-1 flex flex-col bg-bg dark:bg-gradient-to-b dark:from-[#112920] dark:via-[#0E2019] dark:to-[#0E1A14] text-text transition-colors duration-300',
        viewMode === 'map'
          ? 'fixed inset-0 z-20 lg:static lg:z-auto lg:h-dvh overflow-hidden'
          : 'overflow-x-hidden min-h-[calc(100vh-4rem)] lg:min-h-screen pb-32 lg:pb-10',
      )}
    >
      {/* Layer Mode Peta (di-mount saat pertama dibuka agar transisi selanjutnya instan & smooth) */}
      {hasOpenedMap && (
        <div
          aria-hidden={viewMode !== 'map'}
          className={cn(
            'fixed inset-0 lg:absolute transition-all duration-300 ease-out motion-reduce:transition-none',
            viewMode === 'map'
              ? 'z-10 opacity-100 scale-100 pointer-events-auto'
              : 'z-0 opacity-0 scale-[1.02] pointer-events-none',
          )}
        >
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-bg text-xs text-text-muted">
                Memuat peta Kiblat...
              </div>
            }
          >
            <QiblaMap
              userLat={userLat}
              userLng={userLng}
              locationName={locationName}
              qiblaAngle={qiblaAngle}
              distanceKm={distanceKm}
              heading={heading}
              hasSensor={hasSensor}
              accuracySource={accuracySource}
              mapTheme={effectiveMapTheme}
            />
          </Suspense>
        </div>
      )}

      {/* Header & Switcher Terpadu */}
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          viewMode === 'map'
            ? 'pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4'
            : 'relative z-30 mx-auto w-full max-w-md px-4 pt-3 sm:pt-4 mb-4',
        )}
      >
        <QiblaHeaderControls
          locationName={locationName}
          viewMode={viewMode}
          onChangeViewMode={handleChangeViewMode}
          floating={viewMode === 'map'}
        />
      </div>

      {/* Layer Mode Kompas */}
      <main
        aria-hidden={viewMode !== 'compass'}
        className={cn(
          'mx-auto w-full max-w-md px-4 flex flex-col items-center transition-all duration-300 ease-out motion-reduce:transition-none',
          viewMode === 'compass'
            ? 'relative z-10 opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'absolute inset-x-0 top-28 z-0 opacity-0 scale-[0.97] translate-y-2 pointer-events-none',
        )}
      >

        {/* DIAL KOMPAS KIBLAT */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Cincin Luar Kompas */}
          <div
            className={cn(
              'relative flex h-72 w-72 sm:h-80 sm:w-80 items-center justify-center rounded-full bg-gradient-to-b from-[#EDF5F0] via-[#F8FAF8] to-[#FFFFFF] dark:bg-gradient-to-b dark:from-[#1C3B2E] dark:via-[#122A21] dark:to-[#0A1A14] border-4 transition-all duration-300',
              isAligned
                ? 'border-primary/60 shadow-[0_0_28px_rgba(31,122,77,0.28)] dark:shadow-[0_0_32px_rgba(76,195,138,0.3)]'
                : 'border-border dark:border-white/10 shadow-xl dark:shadow-2xl',
            )}
          >
            {/* Garis Pointer Tetap di Atas (Penunjuk Arah Depan Ponsel) */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
              <div
                className={cn(
                  'w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] transition-colors',
                  isAligned ? 'border-t-primary' : 'border-t-gold',
                )}
              />
            </div>

            {/* Piringan Dial Berputar Mengikuti Heading */}
            <div
              className="relative flex h-full w-full items-center justify-center rounded-full will-change-transform"
              style={{ transform: `rotate(${compassRotation}deg)` }}
            >
              {/* Garis-garis Derajat Mata Angin */}
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 h-full w-full pointer-events-none select-none"
              >
                {/* Tick marks per 15 derajat */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const deg = i * 15
                  const isMain = deg % 90 === 0
                  const isSub = deg % 45 === 0
                  const len = isMain ? 10 : isSub ? 7 : 4

                  return (
                    <line
                      key={deg}
                      x1="100"
                      y1="6"
                      x2="100"
                      y2={6 + len}
                      className={cn(
                        isMain
                          ? 'stroke-text/70 dark:stroke-white/70'
                          : 'stroke-text/30 dark:stroke-white/25',
                      )}
                      strokeWidth={isMain ? 1.5 : 1}
                      transform={`rotate(${deg} 100 100)`}
                    />
                  )
                })}

                {/* Angka Derajat Utama */}
                <text x="100" y="24" textAnchor="middle" fill="#E8806F" fontSize="10" fontWeight="bold">
                  N
                </text>
                <text x="180" y="103.5" textAnchor="middle" className="fill-text dark:fill-white font-medium" fontSize="9">
                  E
                </text>
                <text x="100" y="184" textAnchor="middle" className="fill-text dark:fill-white font-medium" fontSize="9">
                  S
                </text>
                <text x="20" y="103.5" textAnchor="middle" className="fill-text dark:fill-white font-medium" fontSize="9">
                  W
                </text>

                {/* Derajat Numerik Antara */}
                <text x="156" y="48" textAnchor="middle" className="fill-text-muted/60 dark:fill-white/40" fontSize="6">
                  45
                </text>
                <text x="156" y="160" textAnchor="middle" className="fill-text-muted/60 dark:fill-white/40" fontSize="6">
                  135
                </text>
                <text x="44" y="160" textAnchor="middle" className="fill-text-muted/60 dark:fill-white/40" fontSize="6">
                  225
                </text>
                <text x="44" y="48" textAnchor="middle" className="fill-text-muted/60 dark:fill-white/40" fontSize="6">
                  315
                </text>
              </svg>

              {/* GAMBAR KA'BAH PADA BUSUR DERAJAT KIBLAT */}
              <div
                className="absolute inset-0 flex items-start justify-center pointer-events-none"
                style={{ transform: `rotate(${qiblaAngle}deg)` }}
              >
                <div
                  className="mt-2.5 flex flex-col items-center"
                  style={{ transform: `rotate(${-(compassRotation + qiblaAngle)}deg)` }}
                >
                  <div
                    title={`Arah Ka'bah: ${qiblaAngle}°`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface dark:bg-[#0E2019] shadow-md ring-2 ring-gold"
                  >
                    {/* Ilustrasi Ka'bah jelas: kubus hitam dengan kiswah & pintu emas */}
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 2L4 5.5v13L12 22l8-3.5v-13L12 2z" fill="#1A1D1B" />
                      <path d="M12 2L4 5.5l8 3.5 8-3.5L12 2z" fill="#2D3330" />
                      <path d="M12 9v13l8-3.5v-13L12 9z" fill="#111312" />
                      {/* Sabuk Kiswah Emas */}
                      <path d="M4 8.2l8 3.5 8-3.5v2l-8 3.5-8-3.5v-2z" fill="#E0B863" />
                      {/* Pintu Ka'bah Emas */}
                      <path d="M14.5 14.5l2.2-1v4.2l-2.2 1v-4.2z" fill="#E0B863" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Lingkaran Pusat Kompas (Tetap tegak di tengah saat piringan berputar) */}
            <div className="absolute z-10 pointer-events-none flex h-32 w-32 sm:h-36 sm:w-36 flex-col items-center justify-center rounded-full bg-surface dark:bg-gradient-to-b dark:from-[#142D23] dark:to-[#0A1713] border-2 border-border dark:border-white/15 shadow-inner transition-colors">
              {/* Teks Utara / Selatan kecil */}
              <div className="flex items-center justify-between w-full px-5 text-[10px] text-text-muted dark:text-white/50">
                <span>W</span>
                <span className="text-[#E8806F] font-bold">N</span>
                <span>E</span>
              </div>

              {/* Heading Terukur Derajat */}
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-text dark:text-white my-0.5 tabular-nums">
                {heading}°
              </div>

              <div className="text-[10px] text-text-muted dark:text-white/50">
                <span>S</span>
              </div>
            </div>
          </div>
        </div>

        {/* Derajat Kiblat & Peringatan Sensor */}
        <div className="w-full text-center mt-2">
          {isAligned && (
            <p className="mb-1 text-primary font-semibold text-sm">
              ✓ Posisi ponsel Anda sudah tepat menghadap Kiblat!
            </p>
          )}

          {/* Nilai Sudut Kiblat Besar Warna Emas */}
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gold tabular-nums">
            {qiblaAngle.toLocaleString('id-ID', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}°
          </div>
          <p className="text-xs text-text-muted dark:text-white/60 mt-1">
            dari Utara Sejati · {distanceKm.toLocaleString('id-ID')} km
          </p>

          {accuracyStatus === 'needs_calibration' && (
            <p
              role="status"
              className="mt-3 inline-block rounded-full bg-gold/15 px-3 py-1 text-[11px] font-medium text-gold"
            >
              Akurasi sensor rendah — gerakkan ponsel membentuk angka 8
            </p>
          )}

          {(accuracySource === 'relative' || accuracyStatus === 'unavailable') && (
            <div
              role="status"
              className="mt-4 w-full rounded-2xl border border-gold/30 bg-gold/10 p-4 text-left"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-text dark:text-white">
                    Browser ini tidak mendukung kompas Kiblat
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-muted dark:text-white/75">
                    Browser ini membatasi akses sensor kompas sehingga arah tidak dapat dideteksi secara akurat. Silakan buka lewat browser bawaan HP atau browser lain untuk menggunakan fitur kompas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Indikator Kemiringan (Vertikal & Horizontal) */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4 mb-4">
          <div className="rounded-2xl border border-border dark:border-white/10 bg-surface dark:bg-white/5 px-4 py-3 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-text-muted dark:text-white/60">
              Vertikal
            </span>
            <span className="mt-0.5 text-2xl font-bold text-gold tabular-nums">
              {Math.abs(verticalTilt)}°
            </span>
          </div>

          <div className="rounded-2xl border border-border dark:border-white/10 bg-surface dark:bg-white/5 px-4 py-3 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-text-muted dark:text-white/60">
              Horizontal
            </span>
            <span className="mt-0.5 text-2xl font-bold text-gold tabular-nums">
              {Math.abs(horizontalTilt)}°
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
