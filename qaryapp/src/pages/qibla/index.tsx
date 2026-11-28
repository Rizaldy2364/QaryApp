import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { MapPin, ChevronDown } from 'lucide-react'
import { useSettings } from '../../features/settings/useSettings'
import { usePageTitle } from '../../lib/usePageTitle'
import { useQiblaCompass } from '../../features/qibla/useQiblaCompass'
import {
  calculateQiblaDirection,
  calculateDistanceToKaaba,
} from '../../features/qibla/lib/qibla'
import { Header } from '../../components/layout/Header'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { cn } from '../../lib/utils'

const QiblaMap = lazy(() => import('../../features/qibla/QiblaMap'))

type QiblaViewMode = 'compass' | 'map'

const VIEW_MODE_OPTIONS: Array<{ value: QiblaViewMode; label: string }> = [
  { value: 'compass', label: 'Kompas' },
  { value: 'map', label: 'Peta' },
]

export default function QiblaPage() {
  usePageTitle('Kiblat')
  const { settings } = useSettings()
  const location = settings.location

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

  const {
    heading,
    verticalTilt,
    horizontalTilt,
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
    <div className="w-full flex-1 flex flex-col justify-between overflow-x-hidden min-h-[calc(100vh-4rem)] lg:min-h-screen bg-bg dark:bg-gradient-to-b dark:from-[#112920] dark:via-[#0E2019] dark:to-[#0E1A14] text-text transition-colors pb-24 lg:pb-8">
      {/* Header Halaman di tengah tanpa icon panah, menyatu dengan background */}
      <Header title="Kiblat" showBack={false} className="bg-transparent" />

      {/* Konten Utama */}
      <main className="mx-auto w-full max-w-md px-4 pt-4 flex flex-col items-center">
        {/* Pemilih Lokasi di Tengah Atas */}
        <div className="mb-4">
          <Link
            to="/lokasi"
            aria-label="Ubah lokasi saat ini"
            className="inline-flex items-center gap-2 rounded-full bg-surface dark:bg-white/10 px-4 py-1.5 text-xs font-medium text-text dark:text-white/90 border border-border dark:border-white/10 hover:bg-surface/80 dark:hover:bg-white/15 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
          >
            <MapPin size={14} className="text-gold shrink-0" />
            <span className="truncate max-w-[200px]">{locationName}</span>
            <ChevronDown size={14} className="text-text-muted dark:text-white/60 shrink-0" />
          </Link>
        </div>

        {/* Switcher Mode Kompas / Peta */}
        <div className="w-full max-w-[240px] mb-4">
          <SegmentedControl
            options={VIEW_MODE_OPTIONS}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>

        {viewMode === 'map' ? (
          <Suspense
            fallback={
              <div className="w-full h-[340px] sm:h-[380px] rounded-2xl border border-border dark:border-white/10 bg-surface animate-pulse flex items-center justify-center text-xs text-text-muted">
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
            />
          </Suspense>
        ) : (
          <>

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
                  style={{ transform: `rotate(-${qiblaAngle}deg)` }}
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

        {/* Instruksi & Derajat Kiblat */}
        <div className="text-center mt-3 mb-6">
          <p className="text-xs text-text-muted dark:text-white/70 max-w-[280px] mx-auto leading-relaxed">
            {isAligned ? (
              <span className="text-primary font-semibold text-sm">
                ✓ Posisi ponsel Anda sudah tepat menghadap Kiblat!
              </span>
            ) : (
              "Putar ponsel hingga gambar Ka'bah berada di puncak kompas"
            )}
          </p>

          {/* Nilai Sudut Kiblat Besar Warna Emas */}
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-gold">
            {qiblaAngle}°
          </div>
          <p className="text-[11px] text-text-muted dark:text-white/50 mt-0.5">
            dari arah Utara Sejati · Jarak: {distanceKm.toLocaleString('id-ID')} km
          </p>

          {accuracyStatus === 'needs_calibration' && (
            <p
              role="status"
              className="mt-2 inline-block rounded-full bg-gold/15 px-3 py-1 text-[11px] font-medium text-gold"
            >
              Akurasi sensor rendah — gerakkan ponsel membentuk angka 8
            </p>
          )}
          {accuracyStatus === 'approximate' && (
            <p
              role="status"
              className="mt-2 inline-block rounded-full bg-surface dark:bg-white/10 px-3 py-1 text-[11px] text-text-muted dark:text-white/60"
            >
              Menggunakan sensor orientasi relatif
            </p>
          )}
          {accuracySource === 'relative' && (
            <>
              <p className="mt-1.5 max-w-[280px] mx-auto text-[11px] leading-relaxed text-text-muted dark:text-white/60">
                Arah kompas mungkin kurang akurat di browser ini. Coba kalibrasi dengan gerakan angka 8 atau buka lewat browser lain.
              </p>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary/15 dark:bg-primary/25 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 dark:hover:bg-primary/35 transition-colors cursor-pointer"
              >
                <MapPin size={13} />
                Lihat Arah di Peta
              </button>
            </>
          )}
        </div>

        {/* Indikator Kemiringan (Vertical & Horizontal) */}
        <div className="w-full flex items-center justify-between px-6 mt-6 mb-4">
          <div className="flex flex-col items-start">
            <span className="text-xs font-normal text-text-muted dark:text-white/60 tracking-wide mb-1">
              Vertical
            </span>
            <span className="text-2xl font-bold text-gold">
              {Math.abs(verticalTilt)}°
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-normal text-text-muted dark:text-white/60 tracking-wide mb-1">
              Horizontal
            </span>
            <span className="text-2xl font-bold text-gold">
              {Math.abs(horizontalTilt)}°
            </span>
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  )
}
