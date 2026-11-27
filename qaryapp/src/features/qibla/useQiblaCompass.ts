import { useEffect, useState, useCallback, useRef } from 'react'

export interface DeviceOrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

interface DeviceOrientationEventConstructorIOS {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export type CompassAccuracySource = 'absolute' | 'relative' | 'none'
export type CompassAccuracyStatus =
  | 'accurate'
  | 'approximate'
  | 'needs_calibration'
  | 'unavailable'

export interface CompassState {
  heading: number // Derajat hadap kompas (0 - 360)
  verticalTilt: number // Kemiringan vertikal (pitch / beta)
  horizontalTilt: number // Kemiringan horizontal (roll / gamma)
  hasSensor: boolean
  isSupported: boolean
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported'
  accuracySource: CompassAccuracySource
  needsCalibration: boolean
  accuracyStatus: CompassAccuracyStatus
}

function getScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0
  return typeof window.screen?.orientation?.angle === 'number'
    ? window.screen.orientation.angle
    : 0
}

/**
 * Menghitung arah kompas (0 - 360° searah jarum jam dari Utara) berdasarkan
 * konvensi W3C DeviceOrientation (`alpha` berlawanan jarum jam).
 * Untuk posisi ponsel normal (|beta| < 75°), digunakan proyeksi langsung agar
 * tidak terjadi lonjakan sudut di sekitar 45°. Untuk posisi hampir tegak
 * (|beta| >= 75°), digunakan proyeksi sumbu -Z (punggung ponsel).
 */
export function computeTiltCompensatedHeading(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle = getScreenOrientationAngle(),
): number {
  let headingDeg: number

  if (Math.abs(beta) < 75) {
    // Konvensi W3C: alpha meningkat berlawanan arah jarum jam dari Utara
    headingDeg = (360 - alpha) % 360
  } else {
    const deg2rad = Math.PI / 180
    const _x = beta * deg2rad
    const _y = gamma * deg2rad
    const _z = alpha * deg2rad

    const cX = Math.cos(_x)
    const cY = Math.cos(_y)
    const cZ = Math.cos(_z)
    const sX = Math.sin(_x)
    const sY = Math.sin(_y)
    const sZ = Math.sin(_z)

    // Proyeksi sumbu -Z (punggung ponsel) ke bidang horizontal Timur (Vx) & Utara (Vy)
    const Vx = -cZ * sY - sZ * sX * cY
    const Vy = -sZ * sY + cZ * sX * cY

    if (Math.abs(Vx) < 1e-6 && Math.abs(Vy) < 1e-6) {
      headingDeg = (360 - alpha) % 360
    } else {
      let rad = Math.atan2(Vx, Vy)
      if (rad < 0) rad += 2 * Math.PI
      headingDeg = (rad * 180) / Math.PI
    }
    void cX
  }

  return (headingDeg + screenAngle + 360) % 360
}

/**
 * Mengekstrak heading mentah dari DeviceOrientationEvent.
 * Pada iOS, `webkitCompassHeading` sudah memperhitungkan orientasi layar dan
 * arah jarum jam dari Utara, sehingga tidak perlu digeser lagi dengan screenAngle.
 */
export function extractHeadingFromEvent(
  event: DeviceOrientationEvent,
  isAbsoluteListener: boolean,
  screenAngle = getScreenOrientationAngle(),
): {
  rawHeading: number | null
  isAbsolute: boolean
  iosAccuracy: number | null
} {
  const iosEvent = event as DeviceOrientationEventIOS

  if (
    typeof iosEvent.webkitCompassHeading === 'number' &&
    Number.isFinite(iosEvent.webkitCompassHeading) &&
    iosEvent.webkitCompassHeading >= 0
  ) {
    const iosAccuracy =
      typeof iosEvent.webkitCompassAccuracy === 'number' &&
      Number.isFinite(iosEvent.webkitCompassAccuracy)
        ? iosEvent.webkitCompassAccuracy
        : null

    return {
      rawHeading: ((iosEvent.webkitCompassHeading % 360) + 360) % 360,
      isAbsolute: true,
      iosAccuracy,
    }
  }

  if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    const isAbsolute = isAbsoluteListener || event.absolute === true
    const rawHeading = computeTiltCompensatedHeading(
      event.alpha,
      event.beta ?? 0,
      event.gamma ?? 0,
      screenAngle,
    )
    return {
      rawHeading,
      isAbsolute,
      iosAccuracy: null,
    }
  }

  return {
    rawHeading: null,
    isAbsolute: false,
    iosAccuracy: null,
  }
}

/**
 * Penghalusan melingkar adaptif: responsif saat ponsel diputar cepat dan
 * meredam jitter mikro saat ponsel diam.
 */
export function smoothCircularHeading(prev: number | null, next: number): number {
  if (prev === null) return ((next % 360) + 360) % 360
  const diff = ((next - prev + 540) % 360) - 180
  const absDiff = Math.abs(diff)
  let factor = 0.1
  if (absDiff > 45) {
    factor = 0.75
  } else if (absDiff > 15) {
    factor = 0.45
  } else if (absDiff > 1.5) {
    factor = 0.22
  }
  return (prev + diff * factor + 360) % 360
}

function checkRequiresIOSPermission(): boolean {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    return false
  }
  const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorIOS
  return typeof ctor.requestPermission === 'function'
}

export function useQiblaCompass() {
  const requiresIOSPermission = checkRequiresIOSPermission()

  const [compass, setCompass] = useState<CompassState>({
    heading: 0,
    verticalTilt: 0,
    horizontalTilt: 0,
    hasSensor: false,
    isSupported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    permissionState: requiresIOSPermission ? 'prompt' : 'granted',
    accuracySource: 'none',
    needsCalibration: false,
    accuracyStatus: 'unavailable',
  })

  const smoothedHeadingRef = useRef<number | null>(null)
  const hasAbsoluteEventRef = useRef(false)
  const lastEmitTimeRef = useRef(0)
  // Pelacak osilasi cepat untuk mendeteksi gangguan magnetik pada Android/browser non-iOS
  const recentDeltasRef = useRef<Array<{ delta: number; time: number }>>([])
  const lastRawHeadingRef = useRef<number | null>(null)

  const processOrientationEvent = useCallback(
    (event: DeviceOrientationEvent, isAbsoluteListener: boolean) => {
      const { rawHeading, isAbsolute, iosAccuracy } = extractHeadingFromEvent(
        event,
        isAbsoluteListener,
      )

      if (rawHeading === null) return

      if (isAbsolute) {
        hasAbsoluteEventRef.current = true
      } else if (hasAbsoluteEventRef.current) {
        // Abaikan event relatif jika sensor absolut sudah aktif
        return
      }

      const now = performance.now()

      // Deteksi gangguan magnetik (osilasi berlawanan arah > 20° berulang dalam 800ms)
      let magneticJitterDetected = false
      if (lastRawHeadingRef.current !== null) {
        const rawDelta = ((rawHeading - lastRawHeadingRef.current + 540) % 360) - 180
        if (Math.abs(rawDelta) > 20) {
          const filtered = recentDeltasRef.current.filter((item) => now - item.time < 800)
          filtered.push({ delta: rawDelta, time: now })
          recentDeltasRef.current = filtered

          let signReversals = 0
          for (let i = 1; i < filtered.length; i++) {
            if (filtered[i].delta * filtered[i - 1].delta < 0) {
              signReversals += 1
            }
          }
          magneticJitterDetected = signReversals >= 2
        }
      }
      lastRawHeadingRef.current = rawHeading

      smoothedHeadingRef.current = smoothCircularHeading(
        smoothedHeadingRef.current,
        rawHeading,
      )

      // Batasi pembaruan React state maksimal ~25fps (setiap 40ms) agar UI tetap ringan
      if (now - lastEmitTimeRef.current < 40) return
      lastEmitTimeRef.current = now

      const roundedHeading = Math.round(smoothedHeadingRef.current) % 360
      const beta = Math.round(event.beta ?? 0)
      const gamma = Math.round(event.gamma ?? 0)

      const iosNeedsCal =
        iosAccuracy !== null && (iosAccuracy < 0 || iosAccuracy > 25)
      const needsCalibration = iosNeedsCal || magneticJitterDetected
      const accuracySource: CompassAccuracySource = isAbsolute ? 'absolute' : 'relative'
      const accuracyStatus: CompassAccuracyStatus = needsCalibration
        ? 'needs_calibration'
        : isAbsolute
          ? 'accurate'
          : 'approximate'

      setCompass((prev) => {
        if (
          prev.hasSensor &&
          prev.heading === roundedHeading &&
          prev.verticalTilt === beta &&
          prev.horizontalTilt === gamma &&
          prev.accuracySource === accuracySource &&
          prev.needsCalibration === needsCalibration &&
          prev.accuracyStatus === accuracyStatus
        ) {
          return prev
        }
        return {
          ...prev,
          heading: roundedHeading,
          verticalTilt: beta,
          horizontalTilt: gamma,
          hasSensor: true,
          permissionState: 'granted',
          accuracySource,
          needsCalibration,
          accuracyStatus,
        }
      })
    },
    [],
  )

  const handleAbsoluteOrientation = useCallback(
    (event: DeviceOrientationEvent) => processOrientationEvent(event, true),
    [processOrientationEvent],
  )

  const handleStandardOrientation = useCallback(
    (event: DeviceOrientationEvent) => processOrientationEvent(event, false),
    [processOrientationEvent],
  )

  // Meminta izin sensor di iOS 13+
  const requestSensorPermission = useCallback(async () => {
    const deviceConstructor = (
      typeof window !== 'undefined' && typeof DeviceOrientationEvent !== 'undefined'
        ? DeviceOrientationEvent
        : undefined
    ) as unknown as DeviceOrientationEventConstructorIOS | undefined

    if (typeof deviceConstructor?.requestPermission === 'function') {
      try {
        const response = await deviceConstructor.requestPermission()
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleStandardOrientation, true)
          setCompass((prev) => ({ ...prev, permissionState: 'granted' }))
          return true
        }
        setCompass((prev) => ({ ...prev, permissionState: 'denied' }))
        return false
      } catch {
        setCompass((prev) => ({ ...prev, permissionState: 'denied' }))
        return false
      }
    }

    window.addEventListener(
      'deviceorientationabsolute',
      handleAbsoluteOrientation as EventListener,
      true,
    )
    window.addEventListener('deviceorientation', handleStandardOrientation, true)
    setCompass((prev) => ({ ...prev, permissionState: 'granted' }))
    return true
  }, [handleAbsoluteOrientation, handleStandardOrientation])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!requiresIOSPermission) {
      window.addEventListener(
        'deviceorientationabsolute',
        handleAbsoluteOrientation as EventListener,
        true,
      )
      window.addEventListener('deviceorientation', handleStandardOrientation, true)
    } else {
      const onFirstInteraction = () => {
        void requestSensorPermission()
      }
      window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true })
      return () => {
        window.removeEventListener('pointerdown', onFirstInteraction)
        window.removeEventListener('deviceorientation', handleStandardOrientation, true)
      }
    }

    return () => {
      window.removeEventListener(
        'deviceorientationabsolute',
        handleAbsoluteOrientation as EventListener,
        true,
      )
      window.removeEventListener('deviceorientation', handleStandardOrientation, true)
    }
  }, [
    requiresIOSPermission,
    handleAbsoluteOrientation,
    handleStandardOrientation,
    requestSensorPermission,
  ])

  return {
    ...compass,
    requestSensorPermission,
  }
}
