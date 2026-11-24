import { describe, expect, it } from 'vitest'
import { matchDoa } from '../search'
import doaJson from '../../../../data/doa.json'
import type { Doa } from '../../../../types'

describe('matchDoa', () => {
  const sampleDoa: Doa = {
    id: 'doa-1',
    categoryId: 'tidur',
    title: 'Doa Sebelum Tidur',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوْتُ وَأَحْيَا',
    transliteration: 'Bismika Allāhumma amūtu wa aḥyā',
    translation: 'Dengan menyebut nama-Mu, ya Allah! Aku mati dan dan hidup.',
    source: 'HR. al-Bukhari',
    reviewStatus: 'unreviewed',
  }

  it('mengembalikan true jika query pencarian kosong', () => {
    expect(matchDoa(sampleDoa, 'Tidur', '')).toBe(true)
    expect(matchDoa(sampleDoa, 'Tidur', '   ')).toBe(true)
  })

  it('mencocokkan berdasarkan judul doa', () => {
    expect(matchDoa(sampleDoa, 'Tidur', 'tidur')).toBe(true)
    expect(matchDoa(sampleDoa, 'Tidur', 'Sebelum Tidur')).toBe(true)
    expect(matchDoa(sampleDoa, 'Tidur', 'bangun')).toBe(false)
  })

  it('mencocokkan berdasarkan nama kategori', () => {
    expect(matchDoa(sampleDoa, 'Tidur', 'tidur')).toBe(true)
    expect(matchDoa(sampleDoa, 'Rumah & Toilet', 'toilet')).toBe(true)
  })

  it('mencocokkan berdasarkan kata dalam terjemahan', () => {
    expect(matchDoa(sampleDoa, 'Tidur', 'menyebut nama-mu')).toBe(true)
    expect(matchDoa(sampleDoa, 'Tidur', 'mati dan dan hidup')).toBe(true)
  })

  it('mengembalikan false bila tidak ada yang cocok', () => {
    expect(matchDoa(sampleDoa, 'Tidur', 'kendaraan bermotor')).toBe(false)
  })
})

describe('Keutuhan Teks Arab Doa Harian (Religious Content Fidelity)', () => {
  it('semua entri doa memiliki teks Arab dan terjemahan utuh', () => {
    expect(doaJson.doa.length).toBeGreaterThan(0)
    expect(doaJson.categories.length).toBeGreaterThan(0)

    const catIds = new Set(doaJson.categories.map((c) => c.id))

    doaJson.doa.forEach((item) => {
      expect(item.id).toBeDefined()
      expect(item.title.trim().length).toBeGreaterThan(0)
      expect(item.arabic.trim().length).toBeGreaterThan(0)
      expect(item.translation.trim().length).toBeGreaterThan(0)
      expect(catIds.has(item.categoryId)).toBe(true)
    })
  })

  it('memastikan teks Arab doa sebelum tidur identik karakter-per-karakter', () => {
    const sebelumTidur = doaJson.doa.find(
      (d) => d.title === 'Doa Sebelum Tidur',
    )
    expect(sebelumTidur).toBeDefined()
    expect(sebelumTidur?.arabic).toBe('بِاسْمِكَ اللَّهُمَّ أَمُوْتُ وَأَحْيَا')
  })
})
