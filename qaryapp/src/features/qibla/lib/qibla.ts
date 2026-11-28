/**
 * Modul kalkulasi arah dan jarak Kiblat Ka'bah (Mekkah).
 * Koordinat Masjidil Haram Ka'bah: 21.422487° N, 39.826206° E
 */

export const KAABA_COORDS = {
  latitude: 21.422487,
  longitude: 39.826206,
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * Menghitung arah Kiblat (bearing) dari lokasi pengguna dalam derajat (0° - 360° dari Utara Sejati).
 */
export function calculateQiblaDirection(userLat: number, userLng: number): number {
  const phi1 = toRadians(userLat)
  const phi2 = toRadians(KAABA_COORDS.latitude)
  const deltaLambda = toRadians(KAABA_COORDS.longitude - userLng)

  const y = Math.sin(deltaLambda)
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda)

  const qiblaRad = Math.atan2(y, x)
  let qiblaDeg = toDegrees(qiblaRad)

  // Normalisasi ke rentang [0, 360)
  qiblaDeg = (qiblaDeg + 360) % 360
  return Number(qiblaDeg.toFixed(1))
}

/**
 * Menghitung jarak ke Ka'bah dalam kilometer menggunakan rumus Haversine.
 */
export function calculateDistanceToKaaba(userLat: number, userLng: number): number {
  const R = 6371 // Radius bumi dalam km
  const phi1 = toRadians(userLat)
  const phi2 = toRadians(KAABA_COORDS.latitude)
  const deltaPhi = toRadians(KAABA_COORDS.latitude - userLat)
  const deltaLambda = toRadians(KAABA_COORDS.longitude - userLng)

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c)
}

/**
 * Menghasilkan titik-titik lintasan geodesic (great-circle) antara dua koordinat
 * menggunakan spherical linear interpolation (slerp) agar garis arah Kiblat di peta
 * mengikuti kelengkungan bumi secara presisi.
 */
export function computeGeodesicPoints(
  startLat: number,
  startLng: number,
  endLat: number = KAABA_COORDS.latitude,
  endLng: number = KAABA_COORDS.longitude,
  segments = 48,
): Array<[number, number]> {
  const lat1 = toRadians(startLat)
  const lng1 = toRadians(startLng)
  const lat2 = toRadians(endLat)
  const lng2 = toRadians(endLng)

  const x1 = Math.cos(lat1) * Math.cos(lng1)
  const y1 = Math.cos(lat1) * Math.sin(lng1)
  const z1 = Math.sin(lat1)

  const x2 = Math.cos(lat2) * Math.cos(lng2)
  const y2 = Math.cos(lat2) * Math.sin(lng2)
  const z2 = Math.sin(lat2)

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2))
  const omega = Math.acos(dot)

  if (omega < 1e-6) {
    return [
      [startLat, startLng],
      [endLat, endLng],
    ]
  }

  const sinOmega = Math.sin(omega)
  const points: Array<[number, number]> = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a = Math.sin((1 - t) * omega) / sinOmega
    const b = Math.sin(t * omega) / sinOmega

    const x = a * x1 + b * x2
    const y = a * y1 + b * y2
    const z = a * z1 + b * z2

    const lat = toDegrees(Math.atan2(z, Math.hypot(x, y)))
    const lng = toDegrees(Math.atan2(y, x))
    points.push([lat, lng])
  }

  return points
}
