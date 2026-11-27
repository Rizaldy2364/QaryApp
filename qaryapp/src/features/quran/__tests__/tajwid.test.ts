import { describe, expect, it } from 'vitest'
import { parseTajwidSegments } from '../tajwid'

describe('parseTajwidSegments', () => {
  it('mempertahankan teks Arab identik karakter-per-karakter', () => {
    const sample = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ'
    const segments = parseTajwidSegments(sample)
    expect(segments.map((s) => s.text).join('')).toBe(sample)
  })

  it('mendeteksi Izhar, Ikhfa, Idgham Bighunnah, Idgham Bilaghunnah, dan Iqlab', () => {
    const izhar = parseTajwidSegments('مِنْ خَوْفٍ')
    expect(izhar.some((s) => s.rule === 'izhar')).toBe(true)

    const ikhfa = parseTajwidSegments('مِنْ قَبْلُ')
    expect(ikhfa.some((s) => s.rule === 'ikhfa')).toBe(true)

    const idghamBighunnah = parseTajwidSegments('مَنْ يَقُولُ')
    expect(idghamBighunnah.some((s) => s.rule === 'idgham_bighunnah')).toBe(true)

    const idghamBilaghunnah = parseTajwidSegments('مِنْ رَبِّهِمْ')
    expect(idghamBilaghunnah.some((s) => s.rule === 'idgham_bilaghunnah')).toBe(true)

    const iqlab = parseTajwidSegments('مِنْ بَعْدِ')
    expect(iqlab.some((s) => s.rule === 'iqlab')).toBe(true)
  })

  it('mendeteksi Ghunnah, Qalqalah, dan Mad', () => {
    const ghunnah = parseTajwidSegments('إِنَّ')
    expect(ghunnah.some((s) => s.rule === 'ghunnah')).toBe(true)

    const qalqalah = parseTajwidSegments('يَدْخُلُونَ')
    expect(qalqalah.some((s) => s.rule === 'qalqalah')).toBe(true)

    const mad = parseTajwidSegments('جَآءَ')
    expect(mad.some((s) => s.rule === 'mad')).toBe(true)
  })
})
