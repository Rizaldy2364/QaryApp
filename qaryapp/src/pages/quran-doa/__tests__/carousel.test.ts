// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import featuredData from '../../../data/featured.json'

describe('Featured Carousel Data Configuration', () => {
  it('harus memiliki daftar surah dan ayat yang valid', () => {
    expect(Array.isArray(featuredData.verses)).toBe(true)
    expect(featuredData.verses.length).toBeGreaterThan(0)
    for (const v of featuredData.verses) {
      expect(typeof v.surah).toBe('number')
      expect(typeof v.ayah).toBe('number')
      expect(v.surah).toBeGreaterThan(0)
      expect(v.ayah).toBeGreaterThan(0)
    }
  })

  it('harus memiliki daftar referensi doa yang terdefinisi', () => {
    expect(Array.isArray(featuredData.doas)).toBe(true)
    expect(featuredData.doas.length).toBeGreaterThan(0)
    for (const id of featuredData.doas) {
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^doa-\d+$/)
    }
  })

  it('harus memiliki daftar referensi kata mutiara/faidah yang terdefinisi', () => {
    expect(Array.isArray(featuredData.wordsOfWisdom)).toBe(true)
    expect(featuredData.wordsOfWisdom.length).toBeGreaterThan(0)
    for (const id of featuredData.wordsOfWisdom) {
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^doa-\d+$/)
    }
  })
})

describe('Carousel Interleaving Logic', () => {
  it('berhasil menggabungkan urutan ayat, doa, dan faidah secara bergantian', () => {
    const verses = ['v1', 'v2', 'v3']
    const doas = ['d1', 'd2']
    const wisdom = ['w1']

    const interleaved: string[] = []
    const maxLen = Math.max(verses.length, doas.length, wisdom.length)
    for (let i = 0; i < maxLen; i++) {
      if (i < verses.length) interleaved.push(verses[i])
      if (i < doas.length) interleaved.push(doas[i])
      if (i < wisdom.length) interleaved.push(wisdom[i])
    }

    expect(interleaved).toEqual(['v1', 'd1', 'w1', 'v2', 'd2', 'v3'])
  })
})
