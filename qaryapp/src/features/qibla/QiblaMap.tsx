import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, Compass, Plus, Minus, Ruler, Route, AlertCircle } from 'lucide-react'
import { KAABA_COORDS, computeGeodesicPoints } from './lib/qibla'
import type { CompassAccuracySource } from './useQiblaCompass'

export interface QiblaMapProps {
  userLat: number
  userLng: number
  locationName: string
  qiblaAngle: number
  distanceKm: number
  heading: number | null
  hasSensor: boolean
  accuracySource: CompassAccuracySource
}

function buildUserArrowHtml(rotationDeg: number, isAligned: boolean): string {
  const fillColor = isAligned ? '#10b981' : '#16a34a'
  const glowStyle = isAligned
    ? 'filter:drop-shadow(0 0 8px rgba(16,185,129,0.9));'
    : 'filter:drop-shadow(0 2px 5px rgba(0,0,0,0.4));'
  const ringHtml = isAligned
    ? '<span style="position:absolute;inset:-4px;border-radius:9999px;background:rgba(16,185,129,0.28);animation:pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite;"></span>'
    : ''

  return `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      ${ringHtml}
      <div data-qibla-arrow style="width:32px;height:32px;transform:rotate(${rotationDeg}deg);transition:transform 80ms linear;${glowStyle}">
        <svg viewBox="0 0 36 36" width="32" height="32" aria-hidden="true">
          <path d="M18 3L30 30L18 24.5L6 30Z" fill="${fillColor}" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round" />
        </svg>
      </div>
    </div>
  `
}

export default function QiblaMap({
  userLat,
  userLng,
  locationName,
  qiblaAngle,
  distanceKm,
  heading,
  hasSensor,
  accuracySource,
}: QiblaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const lastAlignedRef = useRef<boolean | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (!showGuide) return
    const timer = window.setTimeout(() => setShowGuide(false), 4500)
    return () => window.clearTimeout(timer)
  }, [showGuide])

  const isLiveAbsolute =
    accuracySource === 'absolute' && hasSensor && heading !== null && Number.isFinite(heading)
  const arrowRotation = isLiveAbsolute ? heading : qiblaAngle
  const angleDiff = isLiveAbsolute
    ? Math.abs(((heading - qiblaAngle + 540) % 360) - 180)
    : 180
  const isAligned = isLiveAbsolute && angleDiff <= 5

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      center: [userLat, userLng],
      zoom: 17,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const points = computeGeodesicPoints(
      userLat,
      userLng,
      KAABA_COORDS.latitude,
      KAABA_COORDS.longitude,
      64,
    )

    // Halo hijau halus di bawah garis emas agar kontras di berbagai tema peta
    L.polyline(points, {
      color: '#1F7A4D',
      weight: 7,
      opacity: 0.35,
    }).addTo(map)

    const qiblaLine = L.polyline(points, {
      color: '#D4A84B',
      weight: 4,
      opacity: 0.95,
    }).addTo(map)

    const userIcon = L.divIcon({
      className: '',
      html: buildUserArrowHtml(qiblaAngle, false),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })

    const kaabaIcon = L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;border-radius:9999px;background:#1A1D1B;border:2px solid #E0B863;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.45);"><div style="width:12px;height:12px;background:#E0B863;border-radius:2px;"></div></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const userMarker = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 500 })
      .addTo(map)
      .bindPopup(`<strong>Lokasi Anda</strong><br/>${locationName}`)

    L.marker([KAABA_COORDS.latitude, KAABA_COORDS.longitude], { icon: kaabaIcon })
      .addTo(map)
      .bindPopup("<strong>Ka'bah</strong><br/>Masjidil Haram, Mekkah")

    mapRef.current = map
    routeLineRef.current = qiblaLine
    userMarkerRef.current = userMarker
    lastAlignedRef.current = false

    return () => {
      map.remove()
      mapRef.current = null
      routeLineRef.current = null
      userMarkerRef.current = null
      lastAlignedRef.current = null
    }
  }, [userLat, userLng, locationName, qiblaAngle])

  // Perbarui rotasi panah secara halus tanpa me-recreate map atau marker
  useEffect(() => {
    const marker = userMarkerRef.current
    if (!marker) return

    if (lastAlignedRef.current !== isAligned) {
      lastAlignedRef.current = isAligned
      marker.setIcon(
        L.divIcon({
          className: '',
          html: buildUserArrowHtml(arrowRotation, isAligned),
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      )
      return
    }

    const arrowEl = marker.getElement()?.querySelector('[data-qibla-arrow]') as HTMLElement | null
    if (arrowEl) {
      arrowEl.style.transform = `rotate(${arrowRotation}deg)`
    }
  }, [arrowRotation, isAligned])

  const handleFocusUser = () => {
    mapRef.current?.setView([userLat, userLng], 17, { animate: true })
  }

  const handleFitKaabaRoute = () => {
    const line = routeLineRef.current
    if (line && mapRef.current) {
      mapRef.current.fitBounds(line.getBounds(), { padding: [48, 48], animate: true })
    }
  }

  const handleZoomIn = () => {
    mapRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    mapRef.current?.zoomOut()
  }

  return (
    <>
      {/* Peta Full-Screen Background */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 h-full w-full"
        aria-label="Peta arah Kiblat"
      />

      {/* Kontrol Zoom Mengambang di Sisi Kanan */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[450] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Perbesar peta"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/85 dark:bg-[#0E2019]/85 backdrop-blur-md border border-border/80 dark:border-white/15 text-text dark:text-white shadow-md hover:bg-surface cursor-pointer"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Perkecil peta"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/85 dark:bg-[#0E2019]/85 backdrop-blur-md border border-border/80 dark:border-white/15 text-text dark:text-white shadow-md hover:bg-surface cursor-pointer"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Kartu Ringkas Mengambang di Bawah (Aman di atas BottomBar) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 lg:bottom-6 z-[450] flex flex-col items-center px-4 gap-2">
        <div
          role="status"
          aria-live="polite"
          aria-hidden={!showGuide}
          className={`w-full max-w-md rounded-xl bg-[#1A1C1A]/95 dark:bg-[#0E2019]/95 backdrop-blur-md border border-white/15 px-3.5 py-2.5 text-[11px] leading-relaxed text-white/90 shadow-lg transition-all duration-300 ease-out motion-reduce:transition-none ${
            showGuide
              ? 'pointer-events-auto opacity-100 translate-y-0 scale-100'
              : 'pointer-events-none opacity-0 translate-y-2 scale-95'
          }`}
        >
          Sejajarkan posisi Anda dengan garis emas menuju Ka&apos;bah berdasarkan bangunan atau jalan di sekitar.
        </div>

        <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-surface/90 dark:bg-[#1A1C1A]/90 backdrop-blur-md border border-border/80 dark:border-white/10 shadow-xl px-4 py-3">
          {/* Baris Atas: Label Arah Kiblat + Ikon Info & Pill Jarak */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted dark:text-white/75">
              <Compass size={14} className="shrink-0" />
              <span>Arah kiblat</span>
              <button
                type="button"
                onClick={() => setShowGuide((prev) => !prev)}
                aria-label="Info cara membaca arah kiblat di peta"
                aria-expanded={showGuide}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-text-muted dark:text-white/60 hover:bg-bg/70 dark:hover:bg-white/10 hover:text-text dark:hover:text-white transition-colors cursor-pointer"
              >
                <AlertCircle size={13} />
              </button>
              {isAligned && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Menghadap Kiblat
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/25 px-2.5 py-1 text-xs font-medium text-gold tabular-nums">
              <Ruler size={13} className="shrink-0" />
              {distanceKm.toLocaleString('id-ID')} km
            </span>
          </div>

          {/* Nilai Sudut Kiblat Besar */}
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-gold tabular-nums leading-none">
            {qiblaAngle.toLocaleString('id-ID', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}°
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted dark:text-white/60">
            dari Utara Sejati
          </p>

          {/* Dua Tombol Aksi Sejajar */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleFocusUser}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border dark:border-white/15 bg-bg/80 dark:bg-white/5 hover:bg-bg dark:hover:bg-white/10 px-3 py-2 text-xs font-semibold text-text dark:text-white transition-colors cursor-pointer"
            >
              <LocateFixed size={15} className="shrink-0" />
              Lokasi saya
            </button>
            <button
              type="button"
              onClick={handleFitKaabaRoute}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E8C568] hover:bg-[#dfb952] px-3 py-2 text-xs font-semibold text-[#1A1C1A] shadow-sm transition-colors cursor-pointer"
            >
              <Route size={15} className="shrink-0" />
              Garis ke Ka&apos;bah
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
