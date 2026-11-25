import { useEffect, useState, useCallback, useRef } from 'react'

interface DeviceOrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number
}

interface DeviceOrientationEventConstructorIOS {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

interface CompassState {
  heading: number // Derajat hadap kompas (0 - 360)
  verticalTilt: number // Kemiringan vertikal (pitch / beta)
  horizontalTilt: number // Kemiringan horizontal (roll / gamma)
  hasSensor: boolean
  isSupported: boolean
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported'
}

/**
 * Menghitung arah kompas (azimuth 0-360°) dengan kompensasi kemiringan (tilt-compensation)
 * berdasarkan konvensi rotasi Euler Z-X'-Y'' dari spesifikasi W3C DeviceOrientation.
 */
function computeTiltCompensatedHeading(
  alpha: number,
  beta: number,
  gamma: number,
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

  let Vx: number
  let Vy: number

  if (Math.abs(beta) < 45) {
    // Ponsel cenderung datar: proyeksi sumbu +Y (ujung atas ponsel) ke bidang horizontal Timur-Utara
    Vx = -sZ * cX
    Vy = cZ * cX
  } else {
    // Ponsel dipegang tegak/miring: proyeksi sumbu -Z (punggung ponsel) ke bidang horizontal
    Vx = -cZ * sY - sZ * sX * cY
    Vy = -sZ * sY + cZ * sX * cY
  }

  let compassHeading = Math.atan2(Vx, Vy)
  if (compassHeading < 0) {
    compassHeading += 2 * Math.PI
  }

  // Sesuaikan dengan orientasi layar (portrait/landscape)
  const screenAngle =
    typeof window !== 'undefined' && window.screen?.orientation?.angle
      ? window.screen.orientation.angle
      : 0

  return ((compassHeading * 180) / Math.PI + screenAngle + 360) % 360
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
  })

  const smoothedHeadingRef = useRef<number | null>(null)
  const hasAbsoluteEventRef = useRef(false)
  const lastEmitTimeRef = useRef(0)

  // Handler orientasi perangkat dengan filter penghalus (low-pass circular) & throttling
  const processOrientationEvent = useCallback(
    (event: DeviceOrientationEvent, isAbsoluteSource: boolean) => {
      if (isAbsoluteSource && event.alpha !== null) {
        hasAbsoluteEventRef.current = true
      } else if (
        !isAbsoluteSource &&
        hasAbsoluteEventRef.current &&
        typeof (event as DeviceOrientationEventIOS).webkitCompassHeading !== 'number'
      ) {
        // Abaikan event relatif jika sensor absolut sudah aktif
        return
      }

      const iosEvent = event as DeviceOrientationEventIOS
      let rawHeading: number | null = null

      if (typeof iosEvent.webkitCompassHeading === 'number' && !Number.isNaN(iosEvent.webkitCompassHeading)) {
        const screenAngle =
          typeof window !== 'undefined' && window.screen?.orientation?.angle
            ? window.screen.orientation.angle
            : 0
        rawHeading = (iosEvent.webkitCompassHeading + screenAngle + 360) % 360
      } else if (event.alpha !== null) {
        // Gunakan sumber absolut jika tersedia; jika perangkat hanya mengirim deviceorientation standar,
        // tetap proses agar kompas selalu merespon pergerakan HP.
        rawHeading = computeTiltCompensatedHeading(
          event.alpha,
          event.beta ?? 0,
          event.gamma ?? 0,
        )
      }

      if (rawHeading === null) return

      // Penghalusan melingkar (circular exponential smoothing) agar jarum stabil tidak gemetar
      if (smoothedHeadingRef.current === null) {
        smoothedHeadingRef.current = rawHeading
      } else {
        const prev = smoothedHeadingRef.current
        const diff = ((rawHeading - prev + 540) % 360) - 180
        // Jika perubahan sangat kecil (< 0.5°), perhalus lebih kuat; jika besar, respons lebih cepat
        const factor = Math.abs(diff) > 25 ? 0.45 : 0.22
        smoothedHeadingRef.current = (prev + diff * factor + 360) % 360
      }

      // Batasi pembaruan React state maksimal ~25fps (setiap 40ms) agar UI tetap ringan dan bebas kedip
      const now = performance.now()
      if (now - lastEmitTimeRef.current < 40) return
      lastEmitTimeRef.current = now

      const roundedHeading = Math.round(smoothedHeadingRef.current) % 360
      const beta = Math.round(event.beta ?? 0)
      const gamma = Math.round(event.gamma ?? 0)

      setCompass((prev) => {
        if (
          prev.hasSensor &&
          prev.heading === roundedHeading &&
          prev.verticalTilt === beta &&
          prev.horizontalTilt === gamma
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
      // Android / non-iOS: langsung aktifkan otomatis kedua listener (prioritas absolut)
      window.addEventListener(
        'deviceorientationabsolute',
        handleAbsoluteOrientation as EventListener,
        true,
      )
      window.addEventListener('deviceorientation', handleStandardOrientation, true)
    } else {
      // iOS 13+: Safari mewajibkan gestur pengguna untuk requestPermission.
      // Aktifkan otomatis pada sentuhan pertama di mana saja di layar.
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
