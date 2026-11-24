import type { Surah } from '../types'

/**
 * Menormalkan nama Latin surah:
 * - Huruf kecil
 * - Menghilangkan awalan artikel Arab (al-, an-, ar-, as-, at-, az-, ad-, adz-, asy-, ath-)
 * - Menghilangkan tanda hubung (-), kutip/apostrof, dan spasi
 */
export function normalizeSurahName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(adz|asy|ath|al|an|ar|as|at|az|ad)[-\s]/i, '')
    .replace(/['’`\-–—\s]/g, '')
    .trim()
}

/**
 * Memeriksa apakah surah cocok dengan kata kunci pencarian (nama atau nomor)
 */
export function matchSurah(surah: Surah, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  // 1. Pencarian angka/nomor
  if (/^\d+$/.test(q)) {
    return surah.number === Number(q) || String(surah.number).startsWith(q)
  }

  // 2. Pencarian teks nama Latin asli
  const rawLower = surah.nameLatin.toLowerCase()
  if (rawLower.includes(q)) return true

  // 3. Pencarian nama ternormalisasi (misal "baqarah" -> "Al-Baqarah")
  const normSurah = normalizeSurahName(surah.nameLatin)
  const normQuery = normalizeSurahName(q)
  if (normSurah.includes(normQuery)) return true

  // 3b. Bila pengguna mengetik tanpa spasi/strip misal "alfatihah"
  if (normQuery.startsWith('al') && normSurah.includes(normQuery.slice(2))) {
    return true
  }

  // 4. Pencarian arti surah (misal "sapi betina", "pembukaan")
  if (surah.translation.toLowerCase().includes(q)) return true

  return false
}
