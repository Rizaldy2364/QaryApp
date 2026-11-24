import { getSurahList, getSurahDetail } from './api'
import { getLastRead } from '../../lib/storage'

/**
 * Melakukan prefetching cerdas data Al-Qur'an saat peramban dalam keadaan idle (online).
 * Hanya mengambil daftar surah dan surah yang terakhir dibaca.
 * Tidak mengunduh seluruh Al-Qur'an secara agresif.
 */
export function scheduleQuranIdlePrefetch(): void {
  if (typeof window === 'undefined' || !navigator.onLine) return

  const executePrefetch = async () => {
    try {
      // 1. Prefetch daftar surah (114 surah)
      await getSurahList()

      // 2. Prefetch detail surah terakhir dibaca bila ada
      const lastRead = getLastRead()
      if (lastRead && lastRead.surahNumber) {
        await getSurahDetail(lastRead.surahNumber)
      } else {
        // Jika belum ada riwayat baca, prefetch Surah Al-Fatihah (1)
        await getSurahDetail(1)
      }
    } catch {
      // Abaikan kegagalan prefetch latar belakang
    }
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      executePrefetch()
    }, { timeout: 4000 })
  } else {
    setTimeout(executePrefetch, 2500)
  }
}
