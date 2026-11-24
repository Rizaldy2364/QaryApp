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

export function useQiblaCompass() {
  const [compass, setCompass] = useState<CompassState>({
    heading: 0,
    verticalTilt: 0,
    horizontalTilt: 0,
    hasSensor: false,
    isSupported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    permissionState: 'prompt',
  })

  const headingRef = useRef(0)

  // Handler orientasi perangkat
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let heading = 0

    // iOS WebKit compass heading
    const iosEvent = event as DeviceOrientationEventIOS
    if (typeof iosEvent.webkitCompassHeading === 'number') {
      heading = iosEvent.webkitCompassHeading
    } else if (event.alpha !== null) {
      // Android standard orientation (0 = utara saat mutlak, atau relatif)
      // alpha bertambah berlawanan jarum jam, compass heading searah jarum jam:
      heading = (360 - event.alpha) % 360
    }

    const beta = Math.round(event.beta ?? 0)
    const gamma = Math.round(event.gamma ?? 0)

    headingRef.current = Math.round(heading)

    setCompass((prev) => ({
      ...prev,
      heading: Math.round(heading),
      verticalTilt: beta,
      horizontalTilt: gamma,
      hasSensor: true,
      permissionState: 'granted',
    }))
  }, [])

  // Meminta izin sensor di iOS 13+
  const requestSensorPermission = useCallback(async () => {
    const deviceConstructor = (
      typeof window !== 'undefined' ? DeviceOrientationEvent : undefined
    ) as unknown as DeviceOrientationEventConstructorIOS | undefined

    if (typeof deviceConstructor?.requestPermission === 'function') {
      try {
        const response = await deviceConstructor.requestPermission()
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true)
          setCompass((prev) => ({ ...prev, permissionState: 'granted' }))
          return true
        } else {
          setCompass((prev) => ({ ...prev, permissionState: 'denied' }))
          return false
        }
      } catch {
        setCompass((prev) => ({ ...prev, permissionState: 'denied' }))
        return false
      }
    } else {
      // Non-iOS / Android standar
      const eventName =
        'deviceorientationabsolute' in window
          ? 'deviceorientationabsolute'
          : 'deviceorientation'
      window.addEventListener(eventName, handleOrientation as EventListener, true)
      setCompass((prev) => ({ ...prev, permissionState: 'granted' }))
      return true
    }
  }, [handleOrientation])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Cek apakah iOS memerlukan permission eksplisit
    const deviceConstructor = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorIOS
    const requiresPermission =
      typeof deviceConstructor?.requestPermission === 'function'

    if (!requiresPermission) {
      const eventName =
        'ondeviceorientationabsolute' in window
          ? 'deviceorientationabsolute'
          : 'deviceorientation'
      window.addEventListener(eventName, handleOrientation as EventListener, true)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true)
      window.removeEventListener(
        'deviceorientationabsolute',
        handleOrientation as EventListener,
        true,
      )
    }
  }, [handleOrientation])

  return {
    ...compass,
    requestSensorPermission,
  }
}
