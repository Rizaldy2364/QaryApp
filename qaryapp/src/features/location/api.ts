import { fetchWithTimeout } from '../../lib/http'

export interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country_code: string
  country: string
  timezone: string
  admin1?: string
  admin2?: string
}

interface GeocodingApiResponse {
  results?: GeocodingResult[]
}

export async function searchCities(
  query: string,
  countryCode?: string,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  const countryParam = countryCode
    ? `&countryCode=${encodeURIComponent(countryCode.toUpperCase())}`
    : ''
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed,
  )}&count=10&language=id${countryParam}`

  const response = await fetchWithTimeout<GeocodingApiResponse>(url, {
    signal,
    timeoutMs: 10000,
  })

  return response.results || []
}
