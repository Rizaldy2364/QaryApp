// ==========================================
// TIPE RAW DARI API EQURAN.ID V2
// ==========================================

export interface EQuranAudioMap {
  '01': string
  '02': string
  '03': string
  '04': string
  '05': string
  '06': string
  [key: string]: string
}

export interface EQuranAyatItem {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio: EQuranAudioMap
}

export interface EQuranSurahListItem {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: 'Mekah' | 'Madinah' | string
  arti: string
  deskripsi: string
  audioFull: EQuranAudioMap
}

export interface EQuranSurahDetail extends EQuranSurahListItem {
  ayat: EQuranAyatItem[]
  suratSelanjutnya?:
    | {
        nomor: number
        nama: string
        namaLatin: string
        jumlahAyat: number
      }
    | false
  suratSebelumnya?:
    | {
        nomor: number
        nama: string
        namaLatin: string
        jumlahAyat: number
      }
    | false
}

export interface EQuranApiResponse<T> {
  code: number
  message: string
  data: T
}

// ==========================================
// TIPE DOMAIN INTERNAL (Aplikasi QaryApp)
// ==========================================

export interface Ayah {
  number: number
  arabicText: string
  latinText: string
  translationText: string
  audioUrl: string
  audioMap: Record<string, string>
}

export interface Surah {
  number: number
  nameArabic: string
  nameLatin: string
  totalAyahs: number
  revelationPlace: string
  translation: string
  description: string
  audioFullUrl: string
  audioFullMap: Record<string, string>
  ayahs?: Ayah[]
  nextSurah?: { number: number; nameLatin: string } | null
  prevSurah?: { number: number; nameLatin: string } | null
}
