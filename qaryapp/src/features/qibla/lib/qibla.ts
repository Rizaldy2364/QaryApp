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
