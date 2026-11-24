import type { Dzikir } from '../../types'

interface DzikirDataPayload {
  morning: Dzikir[]
  evening: Dzikir[]
}

let cachedDzikir: DzikirDataPayload | null = null

/**
 * Memuat data dzikir secara dinamis (code-split) agar tidak membebani bundel awal.
 */
export async function loadDzikirData(): Promise<DzikirDataPayload> {
  if (cachedDzikir) return cachedDzikir
  const mod = await import('../../data/dzikir.json')
  cachedDzikir = mod.default as DzikirDataPayload
  return cachedDzikir
}

export async function getDzikirList(
  period: 'morning' | 'evening',
): Promise<Dzikir[]> {
  const data = await loadDzikirData()
  return data[period] ?? []
}
