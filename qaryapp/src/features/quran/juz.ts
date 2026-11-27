/**
 * Rentang Juz [awal, akhir] untuk setiap surah (1..114) sesuai mushaf standar.
 */
const SURAH_JUZ_RANGES: ReadonlyArray<readonly [number, number]> = [
  [1, 1], // 1. Al-Fatihah
  [1, 3], // 2. Al-Baqarah
  [3, 4], // 3. Ali 'Imran
  [4, 6], // 4. An-Nisa'
  [6, 7], // 5. Al-Ma'idah
  [7, 8], // 6. Al-An'am
  [8, 9], // 7. Al-A'raf
  [9, 10], // 8. Al-Anfal
  [10, 11], // 9. At-Taubah
  [11, 11], // 10. Yunus
  [11, 12], // 11. Hud
  [12, 13], // 12. Yusuf
  [13, 13], // 13. Ar-Ra'd
  [13, 13], // 14. Ibrahim
  [14, 14], // 15. Al-Hijr
  [14, 14], // 16. An-Nahl
  [15, 15], // 17. Al-Isra'
  [15, 16], // 18. Al-Kahf
  [16, 16], // 19. Maryam
  [16, 16], // 20. Taha
  [17, 17], // 21. Al-Anbiya'
  [17, 17], // 22. Al-Hajj
  [18, 18], // 23. Al-Mu'minun
  [18, 18], // 24. An-Nur
  [18, 19], // 25. Al-Furqan
  [19, 19], // 26. Asy-Syu'ara'
  [19, 20], // 27. An-Naml
  [20, 20], // 28. Al-Qasas
  [20, 21], // 29. Al-'Ankabut
  [21, 21], // 30. Ar-Rum
  [21, 21], // 31. Luqman
  [21, 21], // 32. As-Sajdah
  [21, 22], // 33. Al-Ahzab
  [22, 22], // 34. Saba'
  [22, 22], // 35. Fatir
  [22, 23], // 36. Yasin
  [23, 23], // 37. As-Saffat
  [23, 23], // 38. Sad
  [23, 24], // 39. Az-Zumar
  [24, 24], // 40. Ghafir
  [24, 25], // 41. Fussilat
  [25, 25], // 42. Asy-Syura
  [25, 25], // 43. Az-Zukhruf
  [25, 25], // 44. Ad-Dukhan
  [25, 25], // 45. Al-Jasiyah
  [26, 26], // 46. Al-Ahqaf
  [26, 26], // 47. Muhammad
  [26, 26], // 48. Al-Fath
  [26, 26], // 49. Al-Hujurat
  [26, 26], // 50. Qaf
  [26, 27], // 51. Az-Zariyat
  [27, 27], // 52. At-Tur
  [27, 27], // 53. An-Najm
  [27, 27], // 54. Al-Qamar
  [27, 27], // 55. Ar-Rahman
  [27, 27], // 56. Al-Waqi'ah
  [27, 27], // 57. Al-Hadid
  [28, 28], // 58. Al-Mujadalah
  [28, 28], // 59. Al-Hasyr
  [28, 28], // 60. Al-Mumtahanah
  [28, 28], // 61. As-Saff
  [28, 28], // 62. Al-Jumu'ah
  [28, 28], // 63. Al-Munafiqun
  [28, 28], // 64. At-Tagabun
  [28, 28], // 65. At-Talaq
  [28, 28], // 66. At-Tahrim
  [29, 29], // 67. Al-Mulk
  [29, 29], // 68. Al-Qalam
  [29, 29], // 69. Al-Haqqah
  [29, 29], // 70. Al-Ma'arij
  [29, 29], // 71. Nuh
  [29, 29], // 72. Al-Jinn
  [29, 29], // 73. Al-Muzzammil
  [29, 29], // 74. Al-Muddassir
  [29, 29], // 75. Al-Qiyamah
  [29, 29], // 76. Al-Insan
  [29, 29], // 77. Al-Mursalat
  [30, 30], // 78. An-Naba'
  [30, 30], // 79. An-Nazi'at
  [30, 30], // 80. 'Abasa
  [30, 30], // 81. At-Takwir
  [30, 30], // 82. Al-Infitar
  [30, 30], // 83. Al-Mutaffifin
  [30, 30], // 84. Al-Insyiqaq
  [30, 30], // 85. Al-Buruj
  [30, 30], // 86. At-Tariq
  [30, 30], // 87. Al-A'la
  [30, 30], // 88. Al-Gasyiyah
  [30, 30], // 89. Al-Fajr
  [30, 30], // 90. Al-Balad
  [30, 30], // 91. Asy-Syams
  [30, 30], // 92. Al-Lail
  [30, 30], // 93. Ad-Duha
  [30, 30], // 94. Asy-Syarh
  [30, 30], // 95. At-Tin
  [30, 30], // 96. Al-'Alaq
  [30, 30], // 97. Al-Qadr
  [30, 30], // 98. Al-Bayyinah
  [30, 30], // 99. Az-Zalzalah
  [30, 30], // 100. Al-'Adiyat
  [30, 30], // 101. Al-Qari'ah
  [30, 30], // 102. At-Takasur
  [30, 30], // 103. Al-'Asr
  [30, 30], // 104. Al-Humazah
  [30, 30], // 105. Al-Fil
  [30, 30], // 106. Quraisy
  [30, 30], // 107. Al-Ma'un
  [30, 30], // 108. Al-Kausar
  [30, 30], // 109. Al-Kafirun
  [30, 30], // 110. An-Nasr
  [30, 30], // 111. Al-Lahab
  [30, 30], // 112. Al-Ikhlas
  [30, 30], // 113. Al-Falaq
  [30, 30], // 114. An-Nas
]

export function getSurahJuzLabel(surahNumber: number): string {
  const range = SURAH_JUZ_RANGES[surahNumber - 1]
  if (!range) return ''
  const [start, end] = range
  return start === end ? `Juz ${start}` : `Juz ${start}–${end}`
}

export function formatRevelationPlace(place: string): string {
  const normalized = place.trim().toLowerCase()
  if (normalized === 'mekah' || normalized === 'makkah' || normalized === 'makkiyyah') {
    return 'Makkiyyah'
  }
  if (normalized === 'madinah' || normalized === 'madaniyyah') {
    return 'Madaniyyah'
  }
  return place
}
