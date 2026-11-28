import { useEffect, useState, useCallback, useRef } from 'react'

export interface DeviceOrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

interface DeviceOrientationEventConstructorIOS {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

interface AbsoluteOrientationSensorInstance extends EventTarget {
  quaternion?: [number, number, number, number] | Float64Array | Float32Array
  start: () => void
  stop: () => void
}

interface AbsoluteOrientationSensorConstructor {
  new (options?: {
    frequency?: number
    referenceFrame?: 'device' | 'screen'
  }): AbsoluteOrientationSensorInstance
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
 * Menghitung arah kompas (0 - 360° searah jarum jam dari Utara) dari quaternion
 * [x, y, z, w] milik AbsoluteOrientationSensor (frame Bumi: X=Timur, Y=Utara, Z=Atas).
 * Memilih proyeksi horizontal vektor depan ponsel (+Y) atau punggung ponsel (-Z)
 * yang memiliki panjang proyeksi lebih besar agar stabil baik saat datar maupun tegak.
 */
export function computeHeadingFromQuaternion(
  q: readonly [number, number, number, number],
  screenAngle = getScreenOrientationAngle(),
): number {
  const [x, y, z, w] = q

  // Proyeksi horizontal vektor +Y ponsel (ujung atas) ke bidang Timur (Yx) & Utara (Yy)
  const Yx = 2 * (x * y - w * z)
  const Yy = 1 - 2 * (x * x + z * z)

  // Proyeksi horizontal vektor -Z ponsel (punggung/kamera) ke bidang Timur (Zx) & Utara (Zy)
  const Zx = -2 * (x * z + w * y)
  const Zy = -2 * (y * z - w * x)

  const lenY = Math.hypot(Yx, Yy)
  const lenZ = Math.hypot(Zx, Zy)

  const east = lenZ > lenY ? Zx : Yx
  const north = lenZ > lenY ? Zy : Yy

  if (Math.hypot(east, north) < 1e-6) {
    return (screenAngle + 360) % 360
  }

  let rad = Math.atan2(east, north)
  if (rad < 0) rad += 2 * Math.PI
  const headingDeg = (rad * 180) / Math.PI

  return (headingDeg + screenAngle + 360) % 360
}

function extractTiltFromQuaternion(
  q: readonly [number, number, number, number],
): { beta: number; gamma: number } {
  const [x, y, z, w] = q
  const sinBeta = Math.max(-1, Math.min(1, 2 * (y * z + w * x)))
  const beta = Math.round((Math.asin(sinBeta) * 180) / Math.PI)
  const r20 = 2 * (x * z - w * y)
  const r22 = 1 - 2 * (x * x + y * y)
  const gamma = Math.round((Math.atan2(-r20, r22) * 180) / Math.PI)
  return { beta, gamma }
}

/**
 * Menghitung arah kompas (0 - 360° searah jarum jam dari Utara) berdasarkan
 * matriks rotasi 3D penuh Z-X'-Y'' spesifikasi W3C DeviceOrientation.
 * Memilih proyeksi horizontal +Y atau -Z yang lebih dominan sehingga transisi
 * dari ponsel datar ke tegak mulus tanpa lonjakan sudut.
 */
export function computeTiltCompensatedHeading(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle = getScreenOrientationAngle(),
): number {
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

  // Proyeksi horizontal +Y (ujung atas ponsel)
  const Yx = -sZ * cX
  const Yy = cZ * cX

  // Proyeksi horizontal -Z (punggung ponsel)
  const Zx = -cZ * sY - sZ * sX * cY
  const Zy = -sZ * sY + cZ * sX * cY

  const lenY = Math.hypot(Yx, Yy)
  const lenZ = Math.hypot(Zx, Zy)

  const east = lenZ > lenY ? Zx : Yx
  const north = lenZ > lenY ? Zy : Yy

  let headingDeg: number
  if (Math.hypot(east, north) < 1e-6) {
    headingDeg = (360 - alpha) % 360
  } else {
    let rad = Math.atan2(east, north)
    if (rad < 0) rad += 2 * Math.PI
    headingDeg = (rad * 180) / Math.PI
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
  const hasGenericSensorRef = useRef(false)
  const lastEmitTimeRef = useRef(0)
  // Pelacak osilasi cepat untuk mendeteksi gangguan magnetik pada Android/browser non-iOS
  const recentDeltasRef = useRef<Array<{ delta: number; time: number }>>([])
  const lastRawHeadingRef = useRef<number | null>(null)

  const emitHeadingSample = useCallback(
    (
      rawHeading: number,
      beta: number,
      gamma: number,
      isAbsolute: boolean,
      iosAccuracy: number | null,
    ) => {
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

  const processOrientationEvent = useCallback(
    (event: DeviceOrientationEvent, isAbsoluteListener: boolean) => {
      if (hasGenericSensorRef.current) return

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

      emitHeadingSample(
        rawHeading,
        Math.round(event.beta ?? 0),
        Math.round(event.gamma ?? 0),
        isAbsolute,
        iosAccuracy,
      )
    },
    [emitHeadingSample],
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
      let sensor: AbsoluteOrientationSensorInstance | null = null
      const SensorCtor = (
        window as unknown as {
          AbsoluteOrientationSensor?: AbsoluteOrientationSensorConstructor
        }
      ).AbsoluteOrientationSensor

      const attachDeviceOrientationFallback = () => {
        window.addEventListener(
          'deviceorientationabsolute',
          handleAbsoluteOrientation as EventListener,
          true,
        )
        window.addEventListener('deviceorientation', handleStandardOrientation, true)
      }

      const handleSensorReading = () => {
        const q = sensor?.quaternion
        if (!q || q.length < 4) return
        const tuple: [number, number, number, number] = [q[0], q[1], q[2], q[3]]
        if (tuple.some((n) => !Number.isFinite(n))) return

        hasGenericSensorRef.current = true
        const rawHeading = computeHeadingFromQuaternion(tuple)
        const { beta, gamma } = extractTiltFromQuaternion(tuple)
        emitHeadingSample(rawHeading, beta, gamma, true, null)
      }

      const handleSensorError = () => {
        hasGenericSensorRef.current = false
        try {
          sensor?.stop()
        } catch {
          // Abaikan galat stop sensor
        }
        sensor = null
      }

      // Pasang fallback listener lebih dulu; akan otomatis diabaikan begitu
      // AbsoluteOrientationSensor mulai mengirim pembacaan quaternion yang valid.
      attachDeviceOrientationFallback()

      if (typeof SensorCtor === 'function') {
        try {
          sensor = new SensorCtor({ frequency: 30, referenceFrame: 'device' })
          sensor.addEventListener('reading', handleSensorReading)
          sensor.addEventListener('error', handleSensorError)
          sensor.start()
        } catch {
          handleSensorError()
        }
      }

      return () => {
        if (sensor) {
          sensor.removeEventListener('reading', handleSensorReading)
          sensor.removeEventListener('error', handleSensorError)
          try {
            sensor.stop()
          } catch {
            // Abaikan galat stop sensor
          }
        }
        window.removeEventListener(
          'deviceorientationabsolute',
          handleAbsoluteOrientation as EventListener,
          true,
        )
        window.removeEventListener('deviceorientation', handleStandardOrientation, true)
      }
    }

    const onFirstInteraction = () => {
      void requestSensorPermission()
    }
    window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction)
      window.removeEventListener('deviceorientation', handleStandardOrientation, true)
    }
  }, [
    requiresIOSPermission,
    emitHeadingSample,
    handleAbsoluteOrientation,
    handleStandardOrientation,
    requestSensorPermission,
  ])

  return {
    ...compass,
    requestSensorPermission,
  }
}
