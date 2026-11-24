import { fetchWithTimeout, HttpError } from '../../lib/http'
import { getCache, setCache } from '../../lib/storage'
import {
  DEFAULT_RECITER_ID,
  QURAN_CACHE_TTL_MS,
} from './constants'
import type {
  Ayah,
  EQuranApiResponse,
  EQuranAyatItem,
  EQuranSurahDetail,
  EQuranSurahListItem,
  Surah,
} from './types'

const EQURAN_BASE_URL = 'https://equran.id/api/v2'
const SURAH_LIST_CACHE_KEY = 'quran:surah-list'
const SURAH_DETAIL_CACHE_KEY_PREFIX = 'quran:surah:'

/**
 * Konversi item daftar surah dari API menjadi model domain internal.
 */
export function mapRawSurahListItemToDomain(item: EQuranSurahListItem): Surah {
  return {
    number: item.nomor,
    nameArabic: item.nama,
    nameLatin: item.namaLatin,
    totalAyahs: item.jumlahAyat,
    revelationPlace: item.tempatTurun,
    translation: item.arti,
    description: item.deskripsi,
    audioFullUrl: item.audioFull?.[DEFAULT_RECITER_ID] ?? Object.values(item.audioFull ?? {})[0] ?? '',
    audioFullMap: item.audioFull ?? {},
  }
}

/**
 * Konversi item ayat dari API menjadi model domain internal.
 * PENTING: Teks Arab TIDAK diubah, dipotong, atau dinormalisasi (karakter per karakter identik).
 */
export function mapRawAyahToDomain(item: EQuranAyatItem): Ayah {
  return {
    number: item.nomorAyat,
    arabicText: item.teksArab,
    latinText: item.teksLatin,
    translationText: item.teksIndonesia,
    audioUrl: item.audio?.[DEFAULT_RECITER_ID] ?? Object.values(item.audio ?? {})[0] ?? '',
    audioMap: item.audio ?? {},
  }
}

/**
 * Konversi detail surah lengkap dari API menjadi model domain internal.
 */
export function mapRawSurahDetailToDomain(item: EQuranSurahDetail): Surah {
  return {
    number: item.nomor,
    nameArabic: item.nama,
    nameLatin: item.namaLatin,
    totalAyahs: item.jumlahAyat,
    revelationPlace: item.tempatTurun,
    translation: item.arti,
    description: item.deskripsi,
    audioFullUrl: item.audioFull?.[DEFAULT_RECITER_ID] ?? Object.values(item.audioFull ?? {})[0] ?? '',
    audioFullMap: item.audioFull ?? {},
    ayahs: item.ayat ? item.ayat.map(mapRawAyahToDomain) : [],
    nextSurah:
      item.suratSelanjutnya && typeof item.suratSelanjutnya === 'object'
        ? {
            number: item.suratSelanjutnya.nomor,
            nameLatin: item.suratSelanjutnya.namaLatin,
          }
        : null,
    prevSurah:
      item.suratSebelumnya && typeof item.suratSebelumnya === 'object'
        ? {
            number: item.suratSebelumnya.nomor,
            nameLatin: item.suratSebelumnya.namaLatin,
          }
        : null,
  }
}

/**
 * Mengambil daftar 114 surah dengan strategi Cache-First (IndexedDB).
 * Jika ada di cache dan belum kedaluwarsa (30 hari), kembalikan dari cache dan revalidasi di latar belakang bila online.
 * Jika offline dan tidak ada cache, lempar error yang ramah.
 */
export async function getSurahList(): Promise<{
  surahs: Surah[]
  fromCache: boolean
  isStale: boolean
}> {
  const cached = await getCache<Surah[]>(SURAH_LIST_CACHE_KEY)
  const now = Date.now()

  if (cached && cached.value && Array.isArray(cached.value)) {
    const age = now - new Date(cached.savedAt).getTime()
    const isStale = age > QURAN_CACHE_TTL_MS

    // Revalidasi di latar belakang bila online dan cache sudah lewat umur
    if (navigator.onLine && isStale) {
      fetchSurahListFromApi()
        .then((fresh) => setCache(SURAH_LIST_CACHE_KEY, fresh))
        .catch(() => {
          // Abaikan kegagalan revalidasi latar belakang
        })
    }

    return {
      surahs: cached.value,
      fromCache: true,
      isStale,
    }
  }

  // Jika tidak ada di cache, harus ambil dari jaringan
  try {
    const surahs = await fetchSurahListFromApi()
    await setCache(SURAH_LIST_CACHE_KEY, surahs)
    return {
      surahs,
      fromCache: false,
      isStale: false,
    }
  } catch (error) {
    if (cached && cached.value) {
      return {
        surahs: cached.value,
        fromCache: true,
        isStale: true,
      }
    }
    throw error
  }
}

async function fetchSurahListFromApi(): Promise<Surah[]> {
  const url = `${EQURAN_BASE_URL}/surat`
  const json = await fetchWithTimeout<EQuranApiResponse<EQuranSurahListItem[]>>(url, {
    timeoutMs: 12000,
  })

  if (json.code !== 200 || !Array.isArray(json.data)) {
    throw new HttpError(
      json.message || 'Gagal memuat daftar surah dari server',
      { status: json.code || 500 },
    )
  }

  return json.data.map(mapRawSurahListItemToDomain)
}

/**
 * Mengambil detail surah beserta seluruh ayatnya dengan strategi Cache-First (IndexedDB).
 */
export async function getSurahDetail(surahNumber: number): Promise<{
  surah: Surah
  fromCache: boolean
  isStale: boolean
}> {
  if (surahNumber < 1 || surahNumber > 114) {
    throw new Error(`Nomor surah tidak valid: ${surahNumber}. Harus antara 1 dan 114.`)
  }

  const cacheKey = `${SURAH_DETAIL_CACHE_KEY_PREFIX}${surahNumber}`
  const cached = await getCache<Surah>(cacheKey)
  const now = Date.now()

  if (cached && cached.value && cached.value.ayahs && cached.value.ayahs.length > 0) {
    const age = now - new Date(cached.savedAt).getTime()
    const isStale = age > QURAN_CACHE_TTL_MS

    if (navigator.onLine && isStale) {
      fetchSurahDetailFromApi(surahNumber)
        .then((fresh) => setCache(cacheKey, fresh))
        .catch(() => {})
    }

    return {
      surah: cached.value,
      fromCache: true,
      isStale,
    }
  }

  try {
    const surah = await fetchSurahDetailFromApi(surahNumber)
    await setCache(cacheKey, surah)
    return {
      surah,
      fromCache: false,
      isStale: false,
    }
  } catch (error) {
    if (cached && cached.value) {
      return {
        surah: cached.value,
        fromCache: true,
        isStale: true,
      }
    }
    throw error
  }
}

async function fetchSurahDetailFromApi(surahNumber: number): Promise<Surah> {
  const url = `${EQURAN_BASE_URL}/surat/${surahNumber}`
  const json = await fetchWithTimeout<EQuranApiResponse<EQuranSurahDetail>>(url, {
    timeoutMs: 15000,
  })

  if (json.code !== 200 || !json.data) {
    throw new HttpError(
      json.message || `Gagal memuat Surah nomor ${surahNumber}`,
      { status: json.code || 500 },
    )
  }

  return mapRawSurahDetailToDomain(json.data)
}
