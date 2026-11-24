import { describe, expect, it } from 'vitest'
import { matchSurah, normalizeSurahName } from '../search'
import {
  mapRawAyahToDomain,
  mapRawSurahDetailToDomain,
} from '../../api'
import type {
  EQuranAudioMap,
  EQuranAyatItem,
  EQuranSurahDetail,
  Surah,
} from '../../types'

describe('normalizeSurahName', () => {
  it('menghilangkan awalan artikel al-, at-, an-, dsb.', () => {
    expect(normalizeSurahName('Al-Fatihah')).toBe('fatihah')
    expect(normalizeSurahName('Al-Baqarah')).toBe('baqarah')
    expect(normalizeSurahName('At-Taubah')).toBe('taubah')
    expect(normalizeSurahName('An-Nas')).toBe('nas')
    expect(normalizeSurahName('Asy-Syams')).toBe('syams')
  })

  it('menghapus tanda petik, apostrof, dan tanda hubung', () => {
    expect(normalizeSurahName("Ali 'Imran")).toBe('aliimran')
    expect(normalizeSurahName("Al-An'am")).toBe('anam')
    expect(normalizeSurahName("Al-A'raf")).toBe('araf')
  })
})

describe('matchSurah', () => {
  const sampleSurahs: Surah[] = [
    {
      number: 1,
      nameArabic: 'الفاتحة',
      nameLatin: 'Al-Fatihah',
      totalAyahs: 7,
      revelationPlace: 'Mekah',
      translation: 'Pembukaan',
      description: 'Surah pembuka Al-Qur\'an',
      audioFullUrl: '',
      audioFullMap: {},
    },
    {
      number: 2,
      nameArabic: 'البقرة',
      nameLatin: 'Al-Baqarah',
      totalAyahs: 286,
      revelationPlace: 'Madinah',
      translation: 'Sapi Betina',
      description: 'Surah terpanjang',
      audioFullUrl: '',
      audioFullMap: {},
    },
    {
      number: 3,
      nameArabic: 'آل عمران',
      nameLatin: "Ali 'Imran",
      totalAyahs: 200,
      revelationPlace: 'Madinah',
      translation: 'Keluarga Imran',
      description: 'Keluarga Imran',
      audioFullUrl: '',
      audioFullMap: {},
    },
    {
      number: 9,
      nameArabic: 'التوبة',
      nameLatin: 'At-Taubah',
      totalAyahs: 129,
      revelationPlace: 'Madinah',
      translation: 'Pengampunan',
      description: 'Pengampunan',
      audioFullUrl: '',
      audioFullMap: {},
    },
    {
      number: 114,
      nameArabic: 'الناس',
      nameLatin: 'An-Nas',
      totalAyahs: 6,
      revelationPlace: 'Mekah',
      translation: 'Manusia',
      description: 'Manusia',
      audioFullUrl: '',
      audioFullMap: {},
    },
  ]

  it('mengembalikan true jika query kosong', () => {
    expect(matchSurah(sampleSurahs[0], '')).toBe(true)
    expect(matchSurah(sampleSurahs[1], '   ')).toBe(true)
  })

  it('mencocokkan berdasarkan nomor surah', () => {
    expect(matchSurah(sampleSurahs[0], '1')).toBe(true)
    expect(matchSurah(sampleSurahs[1], '2')).toBe(true)
    expect(matchSurah(sampleSurahs[4], '114')).toBe(true)
    expect(matchSurah(sampleSurahs[1], '9')).toBe(false)
  })

  it('mencocokkan nama Latin tanpa artikel "al-" atau tanda hubung', () => {
    expect(matchSurah(sampleSurahs[0], 'fatihah')).toBe(true)
    expect(matchSurah(sampleSurahs[1], 'baqarah')).toBe(true)
    expect(matchSurah(sampleSurahs[3], 'taubah')).toBe(true)
    expect(matchSurah(sampleSurahs[4], 'nas')).toBe(true)
    expect(matchSurah(sampleSurahs[2], 'imran')).toBe(true)
  })

  it('mencocokkan pencarian query tanpa strip seperti "alfatihah"', () => {
    expect(matchSurah(sampleSurahs[0], 'alfatihah')).toBe(true)
    expect(matchSurah(sampleSurahs[1], 'albaqarah')).toBe(true)
  })

  it('mencocokkan berdasarkan arti terjemahan bahasa Indonesia', () => {
    expect(matchSurah(sampleSurahs[0], 'pembukaan')).toBe(true)
    expect(matchSurah(sampleSurahs[1], 'sapi')).toBe(true)
    expect(matchSurah(sampleSurahs[3], 'pengampunan')).toBe(true)
    expect(matchSurah(sampleSurahs[4], 'manusia')).toBe(true)
  })

  it('mengembalikan false jika tidak ada yang cocok', () => {
    expect(matchSurah(sampleSurahs[0], 'xyz123')).toBe(false)
  })
})

describe('Keutuhan Teks Arab (Religious Content Fidelity)', () => {
  const dummyAudioMap: EQuranAudioMap = {
    '01': 'https://audio/01.mp3',
    '02': 'https://audio/02.mp3',
    '03': 'https://audio/03.mp3',
    '04': 'https://audio/04.mp3',
    '05': 'https://audio/05.mp3',
    '06': 'https://audio/06.mp3',
  }

  it('mapRawAyahToDomain menjaga teks Arab karakter-per-karakter persis tanpa normalisasi', () => {
    const rawAyat: EQuranAyatItem = {
      nomorAyat: 1,
      teksArab: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
      teksLatin: 'bismillāhir-raḥmānir-raḥīm(i).',
      teksIndonesia:
        'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',
      audio: dummyAudioMap,
    }

    const domainAyah = mapRawAyahToDomain(rawAyat)

    // Wajib identik secara byte/karakter
    expect(domainAyah.arabicText).toBe(rawAyat.teksArab)
    expect(domainAyah.arabicText.length).toBe(rawAyat.teksArab.length)
    expect(domainAyah.arabicText).toBe('بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ')
    expect(domainAyah.audioUrl).toBe(rawAyat.audio['05'])
    expect(domainAyah.latinText).toBe(rawAyat.teksLatin)
    expect(domainAyah.translationText).toBe(rawAyat.teksIndonesia)
  })

  it('menjaga teks Arab dengan tanda waqf dan harakat rumit seperti Al-Baqarah ayat 1', () => {
    const rawAyat: EQuranAyatItem = {
      nomorAyat: 1,
      teksArab: 'الۤمّۤ ۚ',
      teksLatin: 'alif lām mīm.',
      teksIndonesia: 'Alif Lām Mīm.',
      audio: dummyAudioMap,
    }

    const domainAyah = mapRawAyahToDomain(rawAyat)
    expect(domainAyah.arabicText).toBe('الۤمّۤ ۚ')
    expect(domainAyah.arabicText).toBe(rawAyat.teksArab)
  })

  it('mapRawSurahDetailToDomain memetakan seluruh ayat tanpa mengubah isi', () => {
    const rawDetail: EQuranSurahDetail = {
      nomor: 1,
      nama: 'الفاتحة',
      namaLatin: 'Al-Fatihah',
      jumlahAyat: 2,
      tempatTurun: 'Mekah',
      arti: 'Pembukaan',
      deskripsi: 'Surah Al-Fatihah',
      audioFull: dummyAudioMap,
      ayat: [
        {
          nomorAyat: 1,
          teksArab: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
          teksLatin: 'bismillāhir-raḥmānir-raḥīm(i).',
          teksIndonesia: 'Dengan nama Allah...',
          audio: dummyAudioMap,
        },
        {
          nomorAyat: 2,
          teksArab: 'اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَۙ',
          teksLatin: 'al-ḥamdu lillāhi rabbil-‘ālamīn(a).',
          teksIndonesia: 'Segala puji bagi Allah...',
          audio: dummyAudioMap,
        },
      ],
      suratSelanjutnya: {
        nomor: 2,
        nama: 'البقرة',
        namaLatin: 'Al-Baqarah',
        jumlahAyat: 286,
      },
      suratSebelumnya: false,
    }

    const domainSurah = mapRawSurahDetailToDomain(rawDetail)
    expect(domainSurah.number).toBe(1)
    expect(domainSurah.nameArabic).toBe('الفاتحة')
    expect(domainSurah.ayahs).toHaveLength(2)
    expect(domainSurah.ayahs?.[0].arabicText).toBe('بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ')
    expect(domainSurah.ayahs?.[1].arabicText).toBe('اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَۙ')
    expect(domainSurah.nextSurah?.nameLatin).toBe('Al-Baqarah')
    expect(domainSurah.prevSurah).toBeNull()
  })
})
