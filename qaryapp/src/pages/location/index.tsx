import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router'
import {
  CheckCircle2,
  ChevronRight,
  Compass,
  Globe,
  History,
  MapPin,
  Search,
} from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { SearchField } from '../../components/ui/SearchField'
import { ListRow } from '../../components/ui/ListRow'
import { Skeleton } from '../../components/feedback/Skeleton'
import { EmptyState } from '../../components/feedback/EmptyState'
import { useSettings } from '../../features/settings/useSettings'
import { useGeolocation } from '../../features/location/useGeolocation'
import { searchCities, type GeocodingResult } from '../../features/location/api'
import { getRecentLocations, addRecentLocation } from '../../lib/storage'
import { findCountryCodeByName, getCountryName } from '../../data/countries'
import { usePageTitle } from '../../lib/usePageTitle'
import type { UserLocation } from '../../types'

const SEARCH_COUNTRY_STORAGE_KEY = 'qaryapp:search-country'
const COUNTRY_TOAST_SESSION_KEY = 'qaryapp:country-toast'

function getSavedSearchCountryCode(fallbackCountryName?: string | null): string {
  try {
    const stored = window.localStorage.getItem(SEARCH_COUNTRY_STORAGE_KEY)
    if (stored && stored.trim().length === 2) {
      return stored.trim().toUpperCase()
    }
  } catch {
    // Abaikan jika localStorage dibatasi
  }
  return findCountryCodeByName(fallbackCountryName) ?? 'ID'
}

export default function LocationPage() {
  usePageTitle('Pilih Lokasi')
  const [searchParams] = useSearchParams()
  const { settings, setLocation } = useSettings()
  const { requestLocation, status: geoStatus, errorMessage: geoError } = useGeolocation()

  const countryCode = (
    searchParams.get('negara') || getSavedSearchCountryCode(settings.location?.country)
  ).toUpperCase()
  const countryName = getCountryName(countryCode)

  const [toastMessage, setToastMessage] = useState<string | null>(() => {
    try {
      const pending = window.sessionStorage.getItem(COUNTRY_TOAST_SESSION_KEY)
      if (pending) {
        window.sessionStorage.removeItem(COUNTRY_TOAST_SESSION_KEY)
        return pending
      }
    } catch {
      // Abaikan jika sessionStorage dibatasi
    }
    return null
  })

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => {
      setToastMessage(null)
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Inisialisasi riwayat lokasi langsung dengan lazy initializer (tanpa effect)
  const [recentLocations, setRecentLocations] = useState<UserLocation[]>(() =>
    getRecentLocations(),
  )

  const abortControllerRef = useRef<AbortController | null>(null)

  const hasSearchQuery = query.trim().length >= 2

  // Debounced search kota (300ms, minimal 2 karakter)
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setSearchError(null)

      try {
        const data = await searchCities(trimmed, countryCode, controller.signal)
        setResults(data)
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setSearchError('Gagal mencari kota. Silakan coba lagi.')
        }
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, countryCode])

  const handleSelectLocation = (loc: UserLocation) => {
    setLocation(loc)
    addRecentLocation(loc)
    setRecentLocations(getRecentLocations())
    setQuery('')

    const matchedCode = findCountryCodeByName(loc.country)
    if (matchedCode) {
      try {
        window.localStorage.setItem(SEARCH_COUNTRY_STORAGE_KEY, matchedCode)
      } catch {
        // Abaikan jika penyimpanan dibatasi
      }
    }

    setToastMessage(`Kota ${loc.city} berhasil dipilih`)
  }

  const handleUseGps = async () => {
    try {
      const loc = await requestLocation()
      handleSelectLocation(loc)
    } catch {
      // Kesalahan ditangani melalui state geoError
    }
  }

  const currentLocation = settings.location
  const displayResults = hasSearchQuery ? results : []

  return (
    <div className="space-y-6">
      <Header title="Pilih Lokasi" showBack={true} />

      <div className="mx-auto max-w-[720px] space-y-6 p-4">
        {/* Kartu Lokasi Saat Ini */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Lokasi aktif</span>
            {currentLocation && (
              <Badge variant={currentLocation.source === 'gps' ? 'next' : 'saved'}>
                {currentLocation.source === 'gps' ? 'Dari GPS' : 'Dipilih manual'}
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-ink">
              <MapPin size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-text truncate">
                {currentLocation ? currentLocation.city : 'Belum ada lokasi'}
              </h2>
              {currentLocation && (
                <p className="text-xs text-text-muted mt-0.5">
                  {currentLocation.country}
                  {currentLocation.coordinates &&
                    ` (${currentLocation.coordinates.latitude.toFixed(2)}, ${currentLocation.coordinates.longitude.toFixed(2)})`}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Tombol Gunakan Lokasi Saya (GPS) */}
        <div className="space-y-2">
          <Button
            variant="primary"
            fullWidth
            icon={<Compass size={18} />}
            loading={geoStatus === 'requesting'}
            onClick={handleUseGps}
          >
            Gunakan lokasi saya
          </Button>

          {geoError && (
            <p className="rounded-lg bg-danger/10 p-3 text-xs text-danger">
              {geoError}
            </p>
          )}
        </div>

        {/* Baris Pilih Negara */}
        <Link
          to={`/lokasi/negara?negara=${countryCode}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        >
          <Card
            interactive
            className="flex items-center justify-between p-3.5 hover:bg-primary-soft/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary-soft text-primary-ink">
                <Globe size={18} strokeWidth={1.75} />
              </div>
              <div>
                <span className="block text-xs text-text-muted">Negara pencarian</span>
                <span className="block text-sm font-semibold text-text">
                  {countryName} ({countryCode})
                </span>
              </div>
            </div>

            <ChevronRight size={18} className="text-text-muted" />
          </Card>
        </Link>

        {/* Pemisah atau pilih kota */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-bg px-3 text-xs uppercase tracking-wider text-text-muted font-medium">
            atau pilih kota
          </span>
        </div>

        {/* Kolom Cari Kota */}
        <div className="space-y-3">
          <SearchField
            label={`Cari kota di ${countryName}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari kota di ${countryName}...`}
          />

          {/* Keadaan Memuat Pencarian */}
          {isSearching && (
            <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
              <Skeleton height={20} width="60%" />
              <Skeleton height={14} width="80%" />
              <Skeleton height={14} width="50%" />
            </div>
          )}

          {/* Keadaan Error Pencarian */}
          {searchError && (
            <p className="rounded-lg bg-danger/10 p-3 text-xs text-danger text-center">
              {searchError}
            </p>
          )}

          {/* Hasil Pencarian */}
          {!isSearching && hasSearchQuery && displayResults.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border/60">
              {displayResults.map((item) => {
                const sub = [item.admin1, item.country].filter(Boolean).join(', ')

                return (
                  <ListRow
                    key={item.id}
                    title={item.name}
                    subtitle={sub}
                    leftElement={<MapPin size={16} className="text-text-muted" />}
                    onClick={() =>
                      handleSelectLocation({
                        city: item.name,
                        country: item.country || countryName,
                        coordinates: {
                          latitude: item.latitude,
                          longitude: item.longitude,
                        },
                        source: 'manual',
                      })
                    }
                  />
                )
              })}
            </div>
          )}

          {/* Hasil Pencarian Kosong */}
          {!isSearching && hasSearchQuery && displayResults.length === 0 && (
            <EmptyState
              icon={<Search size={28} />}
              title="Kota Tidak Ditemukan"
              description={`Tidak ditemukan kota "${query}" di ${countryName}. Coba periksa ejaan atau ubah pilihan negara.`}
            />
          )}

          {/* Saat Kolom Kosong: Tampilkan Terakhir Dipilih */}
          {!hasSearchQuery && (
            <div>
              {recentLocations.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1 text-xs text-text-muted">
                    <History size={14} />
                    <span>Terakhir dipilih</span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border/60">
                    {recentLocations.map((item, idx) => (
                      <ListRow
                        key={`${item.city}-${idx}`}
                        title={item.city}
                        subtitle={item.country}
                        leftElement={<MapPin size={16} className="text-text-muted" />}
                        onClick={() => handleSelectLocation(item)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Search size={28} />}
                  title="Cari Kota"
                  description={`Ketik minimal 2 karakter untuk mencari nama kota di ${countryName}.`}
                />
              )}
            </div>
          )}
        </div>

        {/* Catatan Privasi Lokasi */}
        <p className="text-center text-xs text-text-muted pt-4">
          Lokasi hanya dipakai untuk menghitung jadwal sholat.
        </p>
      </div>

      {/* Bubble Pesan Konfirmasi Pilih Negara / Kota */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-2rem)]"
        >
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-fg shadow-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
