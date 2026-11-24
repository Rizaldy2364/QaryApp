import type { AladhanHijriDate } from '../types'

// Tabel resmi 12 nama bulan Hijriah dalam ejaan baku bahasa Indonesia
export const INDONESIAN_HIJRI_MONTHS: Record<number, string> = {
  1: 'Muharram',
  2: 'Safar',
  3: 'Rabiulawal',
  4: 'Rabiulakhir',
  5: 'Jumadilawal',
  6: 'Jumadilakhir',
  7: 'Rajab',
  8: 'Syakban',
  9: 'Ramadan',
  10: 'Syawal',
  11: 'Zulkaidah',
  12: 'Zulhijah',
}

/**
 * Format tanggal Hijriah standar Indonesia dari objek respons Aladhan:
 * Contoh: "7 Jumadilakhir 1448 H"
 */
export function formatIndonesianHijriDate(hijri: AladhanHijriDate): string {
  const monthNumber = hijri.month.number
  const monthName =
    INDONESIAN_HIJRI_MONTHS[monthNumber] || hijri.month.en || 'Hijriah'
  return `${hijri.day} ${monthName} ${hijri.year} H`
}
