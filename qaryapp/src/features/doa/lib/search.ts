import type { Doa } from '../../../types'
import { normalizeSurahName } from '../../quran/lib/search'

/**
 * Memeriksa apakah doa cocok dengan kata kunci pencarian.
 * Mencocokkan judul doa dan nama kategori dengan normalisasi teks yang sudah ada.
 */
export function matchDoa(
  doa: Doa,
  categoryName: string,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  // 1. Pencarian substring langsung
  if (doa.title.toLowerCase().includes(q)) return true
  if (categoryName.toLowerCase().includes(q)) return true
  if (doa.translation.toLowerCase().includes(q)) return true

  // 2. Pencarian ternormalisasi memakai utilitas search yang sudah ada
  const normQuery = normalizeSurahName(q)
  if (normQuery) {
    const normTitle = normalizeSurahName(doa.title)
    const normCategory = normalizeSurahName(categoryName)
    if (normTitle.includes(normQuery) || normCategory.includes(normQuery)) {
      return true
    }
  }

  return false
}
