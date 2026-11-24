// Pemetaan resmi kode negara (ISO 3166-1 alpha-2) ke ID Metode Perhitungan Aladhan
// Sumber terverifikasi dari endpoint https://api.aladhan.com/v1/methods
export const VERIFIED_PRAYER_METHODS: Record<string, number> = {
  ID: 20, // Kementerian Agama Republik Indonesia (KEMENAG)
  SG: 11, // Majlis Ugama Islam Singapura (MUIS)
  MY: 17, // Jabatan Kemajuan Islam Malaysia (JAKIM)
  SA: 4,  // Umm Al-Qura University, Makkah
  EG: 5,  // Egyptian General Authority of Survey
  KW: 9,  // Kuwait
  QA: 10, // Qatar
  AE: 16, // Dubai
  TN: 18, // Tunisia
  DZ: 19, // Algeria
  MA: 21, // Morocco
  PT: 22, // Comunidade Islamica de Lisboa (Portugal)
  JO: 23, // Ministry of Awqaf, Jordan
  TR: 13, // Diyanet İşleri Başkanlığı, Turkey
  RU: 14, // Spiritual Administration of Muslims of Russia
  FR: 12, // Union Organization Islamic de France
  US: 2,  // Islamic Society of North America (ISNA)
  CA: 2,  // ISNA
  PK: 1,  // University of Islamic Sciences, Karachi
  BD: 1,  // Karachi
  IN: 1,  // Karachi
}

// Fallback standar bila negara tidak terdaftar dan API tidak melakukan auto-detection
export const DEFAULT_PRAYER_METHOD_ID = 3 // Muslim World League (MWL)

/**
 * Mengambil ID metode perhitungan berdasarkan kode negara ISO alpha-2.
 * Jika negara ada dalam daftar pemetaan, kembalikan ID metodenya.
 * Jika tidak ada atau undefined, kembalikan undefined agar API Aladhan menggunakan
 * deteksi otomatis berdasarkan koordinat geografis (auto-detection).
 */
export function getPrayerMethodId(countryCode?: string): number | undefined {
  if (!countryCode) return undefined
  const upper = countryCode.toUpperCase()
  return VERIFIED_PRAYER_METHODS[upper]
}
