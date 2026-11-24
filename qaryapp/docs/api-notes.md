# Catatan Investigasi API (QaryApp)

Hasil investigasi dan pengujian langsung ke layanan pihak ketiga sebelum pengembangan fitur jadwal sholat dan lokasi.

---

## 1. Aladhan API

### A. Endpoint & Parameter

1. **Jadwal Harian Berdasarkan Koordinat:**
   - **URL:** `https://api.aladhan.com/v1/timings`
   - **Parameter:** `latitude` (number), `longitude` (number), `method` (opsional, number).
   - **Format Jam:** `HH:mm` (contoh: `"03:46"`, `"11:25"`), tanpa akhiran zona waktu.
   
2. **Kalender Bulanan Berdasarkan Koordinat:**
   - **URL:** `https://api.aladhan.com/v1/calendar/{year}/{month}`
   - **Parameter:** `latitude` (number), `longitude` (number), `method` (opsional, number).
   - **Format Jam:** `HH:mm (TZ)` (contoh: `"03:50 (WIB)"`, `"11:35 (WIB)"`), memuat akhiran kode zona waktu dalam tanda kurung. Diperlukan parsing yang memotong bagian spasi/tanda kurung.

3. **Daftar Metode Perhitungan:**
   - **URL:** `https://api.aladhan.com/v1/methods`

### B. Header CORS
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers: Authorization, origin, if-none-match, Content-Type, Accept-Encoding`
- CORS terbuka penuh dan dapat dipanggil langsung dari peramban web (client-side).

### C. Hasil Verifikasi Asumsi
1. **Kode Metode Kemenag:** Terbukti **ID: 20** (`"KEMENAG": {"id": 20, "name": "Kementerian Agama Republik Indonesia", "params": {"Fajr": 20, "Isha": 18}}`). Kode lama 11 yang tercantum di beberapa dokumen adalah Singapore (MUIS).
2. **Perilaku Tanpa Parameter `method`:** Aladhan melakukan pemilihan metode otomatis berbasis geolokasi koordinat. Uji coba koordinat Yogyakarta (`lat: -7.7956, lng: 110.3695`) tanpa parameter `method` mengembalikan:
   - `meta.method.id: 20`
   - `meta.method.name: "Kementerian Agama Republik Indonesia"`
   - Jadwal waktu Subuh hingga Isya sama persis (03:46, 11:25, 14:49, 17:41, 18:56) dengan pemanggilan eksplisit `method=20`.

### D. Struktur Data Kunci
- **Tanggal Hijriah:**
  - `data.date.hijri.day`: string (contoh `"14"`)
  - `data.date.hijri.month.number`: number (1 sampai 12, contoh `6`)
  - `data.date.hijri.year`: string (contoh `"1448"`)
- **Metadata:**
  - `data.meta.timezone`: string IANA timezone (contoh `"Asia/Jakarta"`)
  - `data.meta.method.id`: number

---

## 2. Open-Meteo Geocoding API

### A. Endpoint & Parameter
- **URL:** `https://geocoding-api.open-meteo.com/v1/search`
- **Parameter:**
  - `name`: string (nama kota, min 2 karakter)
  - `count`: number (jumlah hasil, e.g. 5 atau 10)
  - `language`: `id` (bahasa Indonesia)
  - `countryCode`: kode negara ISO 3166-1 alpha-2 (contoh: `ID`, `MY`)

### B. Header CORS
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: accept, authorization, content-type, origin, x-requested-with`
- CORS terbuka penuh dan dapat dipanggil langsung dari client browser.

### C. Contoh Respons
```json
{
  "results": [
    {
      "id": 1621177,
      "name": "DI Yogyakarta",
      "latitude": -7.80139,
      "longitude": 110.36472,
      "elevation": 110,
      "feature_code": "PPLA",
      "country_code": "ID",
      "timezone": "Asia/Jakarta",
      "country": "Indonesia",
      "admin1": "Yogyakarta",
      "admin2": "Kota Yogyakarta"
    }
  ]
}
```

---

## 3. Definisi Tipe TypeScript (Dari Respons Nyata)

```typescript
export interface AladhanTimings {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Sunset: string
  Maghrib: string
  Isha: string
  Imsak: string
  Midnight: string
  Firstthird: string
  Lastthird: string
}

export interface AladhanHijriDate {
  date: string
  format: string
  day: string
  month: {
    number: number
    en: string
    ar: string
    days?: number
  }
  year: string
  designation: {
    abbreviated: string
    expanded: string
  }
}

export interface AladhanGregorianDate {
  date: string
  format: string
  day: string
  month: {
    number: number
    en: string
  }
  year: string
}

export interface AladhanMeta {
  latitude: number
  longitude: number
  timezone: string
  method: {
    id: number
    name: string
  }
}

export interface AladhanDayData {
  timings: AladhanTimings
  date: {
    readable: string
    timestamp: string
    gregorian: AladhanGregorianDate
    hijri: AladhanHijriDate
  }
  meta: AladhanMeta
}

export interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country_code: string
  country: string
  timezone: string
  admin1?: string
  admin2?: string
}
```

---

## 4. EQuran.id v2 API (Al-Qur'an)

### A. Endpoint & Parameter
1. **Daftar Surah (114 Surah):**
   - **URL:** `https://equran.id/api/v2/surat`
   - **Metode:** GET
   - **Respons:** `{ code: 200, message: "...", data: SurahListItem[] }`
2. **Detail Surah per Nomor:**
   - **URL:** `https://equran.id/api/v2/surat/{nomor}` (contoh `/1`, `/2`, `/9`)
   - **Metode:** GET
   - **Respons:** `{ code: 200, message: "...", data: SurahDetail }`

### B. Header CORS & Rate Limit
- `Access-Control-Allow-Origin: *` (CORS terbuka penuh, dapat diakses dari browser)
- Header rate limit tidak dikirim secara eksplisit oleh server.

### C. Temuan Karakteristik Data
1. **Transliterasi & Terjemahan:**
   - Keduanya **tersedia lengkap** di setiap objek ayat:
     - `teksArab`: teks Arab asli dengan harakat lengkap.
     - `teksLatin`: transliterasi Latin resmi Kemenag.
     - `teksIndonesia`: terjemahan bahasa Indonesia lengkap.
2. **Audio:**
   - **Audio per Ayat:** Tersedia di field `ayat[i].audio` dalam bentuk objek 6 qari:
     - `'01'`: Abdullah Al-Juhany
     - `'02'`: Abdul Muhsin Al-Qasim
     - `'03'`: Abdurrahman as-Sudais
     - `'04'`: Ibrahim Al-Dossari
     - `'05'`: Misyari Rasyid Al-Afasi (digunakan sebagai qari bawaan aplikasi)
     - `'06'`: Yasser Al-Dosari
   - **Audio per Surah:** Tersedia di field `audioFull` dengan 6 qari yang sama.
3. **Perlakuan Bismillah:**
   - Pada **Surah 1 (Al-Fatihah)**: Bismillah merupakan ayat ke-1 (`nomorAyat: 1`, `teksArab: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ"`).
   - Pada **Surah 2 (Al-Baqarah)** dan surah-surah lainnya: Ayat ke-1 langsung berupa awal teks surah (contoh Al-Baqarah: `nomorAyat: 1`, `teksArab: "الۤمّۤ ۚ"`). Bismillah tidak digabungkan ke ayat 1.
   - Pada **Surah 9 (At-Taubah)**: Ayat ke-1 langsung berupa `"بَرَاۤءَةٌ مِّنَ اللّٰهِ وَرَسُوْلِهٖٓ..."` tanpa bismillah, sesuai kaidah mushaf.
   - Aturan aplikasi: Teks Arab ditampilkan persis dari API tanpa menambahkan atau memodifikasi bismillah di luar data API.
4. **Ukuran Data:**
   - Respons Surah Al-Baqarah (surah terpanjang, 286 ayat) berukuran **337.244 bytes (~337 KB)**, diunduh dalam waktu ~80 ms pada koneksi normal.
5. **Tafsir:**
   - Tersedia di endpoint terpisah `/api/v2/tafsir/{nomor}`, namun tidak dikerjakan pada tahap ini sesuai batasan tugas.

### D. Tipe TypeScript Respons Nyata EQuran.id

```typescript
export interface EQuranAudioMap {
  '01': string
  '02': string
  '03': string
  '04': string
  '05': string
  '06': string
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
  suratSelanjutnya?: {
    nomor: number
    nama: string
    namaLatin: string
    jumlahAyat: number
  } | false
  suratSebelumnya?: {
    nomor: number
    nama: string
    namaLatin: string
    jumlahAyat: number
  } | false
}

export interface EQuranApiResponse<T> {
  code: number
  message: string
  data: T
}
```

