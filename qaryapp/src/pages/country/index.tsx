import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Check } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { SearchField } from '../../components/ui/SearchField'
import { getCountryName, getSortedCountries } from '../../data/countries'
import { usePageTitle } from '../../lib/usePageTitle'

const SEARCH_COUNTRY_STORAGE_KEY = 'qaryapp:search-country'
const COUNTRY_TOAST_SESSION_KEY = 'qaryapp:country-toast'

export default function CountryPage() {
  usePageTitle('Pilih Negara')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedCode = (searchParams.get('negara') || 'ID').toUpperCase()

  const [searchQuery, setSearchQuery] = useState('')
  const allCountries = useMemo(() => getSortedCountries(), [])

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allCountries
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [allCountries, searchQuery])

  const handleSelect = (code: string) => {
    const chosenName = getCountryName(code)
    try {
      window.localStorage.setItem(SEARCH_COUNTRY_STORAGE_KEY, code)
      window.sessionStorage.setItem(
        COUNTRY_TOAST_SESSION_KEY,
        `Negara ${chosenName} berhasil dipilih`,
      )
    } catch {
      // Abaikan jika penyimpanan dibatasi
    }

    if (
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1)
    } else {
      navigate(`/lokasi?negara=${code}`, { replace: true })
    }
  }

  return (
    <div className="space-y-4">
      <Header title="Pilih Negara" showBack={true} />

      <div className="mx-auto max-w-[720px] space-y-4 p-4">
        <SearchField
          label="Cari negara"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama negara..."
        />

        <div className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border/60">
          {filteredCountries.map((country) => {
            const isSelected = country.code === selectedCode

            return (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelect(country.code)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-150 motion-reduce:transition-none cursor-pointer hover:bg-primary-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected ? 'bg-primary-soft text-primary-ink font-semibold' : 'text-text'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-text-muted">
                    {country.code}
                  </span>
                  <span className="text-sm">{country.name}</span>
                </div>

                {isSelected && (
                  <Check size={18} className="text-primary-ink" strokeWidth={2} />
                )}
              </button>
            )
          })}

          {filteredCountries.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">
              Negara tidak ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
