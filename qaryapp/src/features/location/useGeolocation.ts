import { useState, useCallback } from 'react'
import type { UserLocation } from '../../types'

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'success'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error'

export interface GeolocationState {
  status: GeolocationStatus
  location: UserLocation | null
  errorMessage: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    status: 'idle',
    location: null,
    errorMessage: null,
  })

  const requestLocation = useCallback(
    (): Promise<UserLocation> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          const errMsg = 'Layanan lokasi (GPS) tidak didukung pada peramban ini.'
          setState({
            status: 'unavailable',
            location: null,
            errorMessage: errMsg,
          })
          reject(new Error(errMsg))
          return
        }

        setState({
          status: 'requesting',
          location: null,
          errorMessage: null,
        })

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLoc: UserLocation = {
              country: 'Indonesia',
              city: 'Lokasi saat ini',
              coordinates: {
                latitude: Number(position.coords.latitude.toFixed(4)),
                longitude: Number(position.coords.longitude.toFixed(4)),
              },
              source: 'gps',
            }

            setState({
              status: 'success',
              location: userLoc,
              errorMessage: null,
            })
            resolve(userLoc)
          },
          (error) => {
            let status: GeolocationStatus = 'error'
            let message = 'Gagal mendeteksi lokasi perangkat.'

            switch (error.code) {
              case error.PERMISSION_DENIED:
                status = 'denied'
                message =
                  'Izin lokasi ditolak. Silakan izinkan akses lokasi di pengaturan peramban atau pilih kota secara manual.'
                break
              case error.POSITION_UNAVAILABLE:
                status = 'unavailable'
                message =
                  'Informasi lokasi tidak tersedia saat ini. Silakan coba kembali atau pilih kota secara manual.'
                break
              case error.TIMEOUT:
                status = 'timeout'
                message =
                  'Waktu permintaan lokasi habis. Silakan periksa GPS perangkat Anda atau pilih kota secara manual.'
                break
            }

            setState({
              status,
              location: null,
              errorMessage: message,
            })
            reject(new Error(message))
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 1000 * 60 * 10, // 10 menit
          },
        )
      })
    },
    [],
  )

  return {
    ...state,
    requestLocation,
  }
}
