import type { Doa, DoaCategory } from '../../types'

interface DoaDataPayload {
  categories: DoaCategory[]
  doa: Doa[]
}

let cachedPayload: DoaDataPayload | null = null

/**
 * Memuat data doa secara dinamis (code-split) agar tidak membebani bundel awal.
 */
export async function loadDoaData(): Promise<DoaDataPayload> {
  if (cachedPayload) return cachedPayload
  const mod = await import('../../data/doa.json')
  cachedPayload = mod.default as DoaDataPayload
  return cachedPayload
}

export async function getDoaCategories(): Promise<DoaCategory[]> {
  const data = await loadDoaData()
  return data.categories
}

export async function getDoaList(): Promise<Doa[]> {
  const data = await loadDoaData()
  return data.doa
}

export async function getDoaById(id: string | number): Promise<Doa | null> {
  const data = await loadDoaData()
  return data.doa.find((d) => String(d.id) === String(id)) ?? null
}
