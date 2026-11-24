// Daftar kode negara ISO 3166-1 alpha-2
export const ISO_COUNTRY_CODES: string[] = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS',
  'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR',
  'BN', 'BG', 'BF', 'BI', 'CV', 'KH', 'CM', 'CA', 'CF', 'TD', 'CL', 'CN',
  'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ', 'DK', 'DJ',
  'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI',
  'FR', 'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY',
  'HT', 'HN', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM',
  'JP', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR', 'KW', 'KG', 'LA', 'LV', 'LB',
  'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT',
  'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM',
  'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'MK', 'NO', 'OM', 'PK',
  'PW', 'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'RU', 'RW',
  'KN', 'LC', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG',
  'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD', 'SR', 'SE', 'CH',
  'SY', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV',
  'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'YE',
  'ZM', 'ZW',
]

export interface CountryItem {
  code: string
  name: string
}

let cachedSortedCountries: CountryItem[] | null = null

export function getSortedCountries(): CountryItem[] {
  if (cachedSortedCountries) {
    return cachedSortedCountries
  }

  const displayNames = new Intl.DisplayNames(['id'], { type: 'region' })

  const countries = ISO_COUNTRY_CODES.map((code) => {
    let name: string
    try {
      name = displayNames.of(code) || code
    } catch {
      name = code
    }
    return { code, name }
  })

  // Urutkan menurut nama tampilan bahasa Indonesia (A-Z)
  countries.sort((a, b) => a.name.localeCompare(b.name, 'id'))

  cachedSortedCountries = countries
  return countries
}

export function getCountryName(code: string): string {
  try {
    const displayNames = new Intl.DisplayNames(['id'], { type: 'region' })
    return displayNames.of(code) || code
  } catch {
    return code
  }
}
