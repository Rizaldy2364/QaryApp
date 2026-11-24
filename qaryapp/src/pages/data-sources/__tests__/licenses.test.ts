// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import licensesData from '../../../data/licenses.json'

interface LicenseItemTest {
  id: string
  name: string
  usage: string
  sourceUrl: string
  licenseText: string
  attribution?: string
}

describe('Data Sources and Licenses Data Integrity', () => {
  it('harus memuat seluruh 7 penyedia sumber data dan aset penting', () => {
    expect(Array.isArray(licensesData)).toBe(true)
    expect(licensesData.length).toBe(7)

    const expectedIds = [
      'fitrahive-dua-dhikr',
      'equran-id',
      'aladhan',
      'open-meteo',
      'amiri-font',
      'plus-jakarta-sans',
      'lucide-icons',
    ]

    const actualIds = (licensesData as LicenseItemTest[]).map((item) => item.id)
    for (const id of expectedIds) {
      expect(actualIds).toContain(id)
    }
  })

  it('setiap entri lisensi memiliki nama, kegunaan, URL sumber, dan teks lisensi yang tidak kosong', () => {
    for (const item of licensesData as LicenseItemTest[]) {
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.usage.length).toBeGreaterThan(0)
      expect(item.sourceUrl.startsWith('http')).toBe(true)
      expect(item.licenseText.length).toBeGreaterThan(0)
    }
  })

  it('Open-Meteo memuat atribusi wajib GeoNames sesuai ketentuan', () => {
    const openMeteo = (licensesData as LicenseItemTest[]).find((item) => item.id === 'open-meteo')
    expect(openMeteo).toBeDefined()
    expect(openMeteo?.attribution).toContain('GeoNames')
    expect(openMeteo?.attribution).toContain('Open-Meteo')
  })
})
