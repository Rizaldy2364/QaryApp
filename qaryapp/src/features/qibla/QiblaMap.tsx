import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, Compass } from 'lucide-react'
import { KAABA_COORDS, computeGeodesicPoints } from './lib/qibla'

export interface QiblaMapProps {
  userLat: number
  userLng: number
  locationName: string
  qiblaAngle: number
  distanceKm: number
}

export default function QiblaMap({
  userLat,
  userLng,
  locationName,
  qiblaAngle,
  distanceKm,
}: QiblaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      center: [userLat, userLng],
      zoom: 17,
      zoomControl: true,
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
      html: '<div style="width:18px;height:18px;border-radius:9999px;background:#1F7A4D;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    const kaabaIcon = L.divIcon({
      className: '',
      html: '<div style="width:26px;height:26px;border-radius:9999px;background:#1A1D1B;border:2px solid #E0B863;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.45);"><div style="width:12px;height:12px;background:#E0B863;border-radius:2px;"></div></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })

    L.marker([userLat, userLng], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<strong>Lokasi Anda</strong><br/>${locationName}`)

    L.marker([KAABA_COORDS.latitude, KAABA_COORDS.longitude], { icon: kaabaIcon })
      .addTo(map)
      .bindPopup("<strong>Ka'bah</strong><br/>Masjidil Haram, Mekkah")

    mapRef.current = map
    routeLineRef.current = qiblaLine

    return () => {
      map.remove()
      mapRef.current = null
      routeLineRef.current = null
    }
  }, [userLat, userLng, locationName])

  const handleFocusUser = () => {
    mapRef.current?.setView([userLat, userLng], 17, { animate: true })
  }

  const handleFitKaabaRoute = () => {
    const line = routeLineRef.current
    if (line && mapRef.current) {
      mapRef.current.fitBounds(line.getBounds(), { padding: [36, 36], animate: true })
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full h-[340px] sm:h-[380px] rounded-2xl overflow-hidden border border-border dark:border-white/10 shadow-lg bg-surface">
        <div
          ref={containerRef}
          className="h-full w-full z-0"
          aria-label="Peta arah Kiblat"
        />

        {/* Tombol kontrol cepat di atas peta */}
        <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-2">
          <button
            type="button"
            onClick={handleFocusUser}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface/95 dark:bg-[#0E2019]/95 px-3 py-1.5 text-[11px] font-medium text-text dark:text-white border border-border dark:border-white/15 shadow-md hover:bg-surface cursor-pointer"
          >
            <LocateFixed size={13} className="text-primary" />
            Lokasi Saya
          </button>
          <button
            type="button"
            onClick={handleFitKaabaRoute}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface/95 dark:bg-[#0E2019]/95 px-3 py-1.5 text-[11px] font-medium text-text dark:text-white border border-border dark:border-white/15 shadow-md hover:bg-surface cursor-pointer"
          >
            <Compass size={13} className="text-gold" />
            Garis ke Ka&apos;bah
          </button>
        </div>
      </div>

      {/* Ringkasan arah & panduan patokan bangunan */}
      <div className="mt-4 text-center">
        <div className="text-3xl font-extrabold tracking-tight text-gold">
          {qiblaAngle}°
        </div>
        <p className="text-[11px] text-text-muted dark:text-white/60 mt-0.5">
          dari arah Utara Sejati · Jarak: {distanceKm.toLocaleString('id-ID')} km
        </p>
        <p className="mt-2 max-w-[300px] mx-auto text-[11px] leading-relaxed text-text-muted dark:text-white/70">
          Sejajarkan posisi Anda dengan garis emas menuju Ka&apos;bah berdasarkan bangunan atau jalan di sekitar.
        </p>
      </div>
    </div>
  )
}
