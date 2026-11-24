# Catatan Audit Kualitas & Lighthouse - QaryApp

Dokumen evaluasi metrik performa, keamanan dependensi, kontras WCAG, dan hasil audit Lighthouse CLI untuk QaryApp.

---

## 1. Hasil Verifikasi Otomatis Pipeline (`pnpm check`)

Perintah `pnpm check` menjalankan lima lapis verifikasi teknis secara deterministik:
1. **ESLint (`pnpm lint`)**: 0 error, 0 warning (lulus aturan TypeScript & React Hooks).
2. **Unit Tests (`pnpm exec vitest run`)**: 8 berkas tes, 49 uji lulus (100% lulus; mencakup perhitungan sholat, kalender Hijriah, navigasi dzikir, normalisasi pencarian).
3. **Data Integrity Check (`pnpm data:check`)**: 100% integritas data doa (46 entri), dzikir (38 entri), dan lisensi terverifikasi valid.
4. **WCAG Contrast Check (`pnpm check:contrast`)**: 11 pasangan warna teks & ikon diuji di tema Terang dan Gelap; **100% Lulus rasio ambang 4.5:1 (teks) dan 3.0:1 (ikon)**.
5. **Production Build (`pnpm build`)**: Kompilasi TypeScript sukses (`tsc -b`), bundel Vite teroptimasi tanpa galat.

---

## 2. Metrik Performa & Ukuran Bundel Terukur

### Pengukuran Ukuran JS Awal Rute Beranda (Gzip):
- **Perintah Pengukuran**: `pnpm build`
- **Berkas Entri Utama**: `dist/assets/index-_QenhuZF.js`
- **Ukuran Terukur**:
  - Ukuran Mentah (*raw*): **315.11 kB**
  - Ukuran Terkompresi (*gzip*): **98.40 kB** (dihitung oleh Vite) / **95.13 kB** (dihitung oleh Node.js `zlib.gzipSync`)
- **Modul Preload HTML (`index.html`)**: `dist/assets/Header-C9Wcr3Bj.js` (raw: 35.46 kB, gzip: 13.25 kB)
- **Penjelasan Selisih Angka**:
  - Draf dokumen sebelumnya mencatat estimasi `~74.5 kB` yang merupakan **asumsi kasar fiktif** sebelum pengukuran nyata dilakukan.
  - Angka yang **benar dan terukur** dari hasil kompilasi Vite produksi adalah **98.40 kB gzip** untuk berkas entri JavaScript utama (`index-[hash].js`).

### Audit Dependensi Produksi:
- **Perintah**: `pnpm audit --prod`
- **Hasil Pengukuran**: `No known vulnerabilities found` (0 kerentanan ditemukan pada seluruh paket dependensi produksi).

### Pemuatan Berkas Font:
- **Status Pengukuran Runtime**: Belum diukur pada peramban klien nyata (bergantung pada karakter yang dirender di layar dan penanganan *font glyph caching* peramban).
- **Hasil Terukur pada Artefak Build**: Jumlah berkas font di `dist/assets/` berkurang dari 31 berkas menjadi **14 berkas** (7 berkas WOFF2 + 7 berkas fallback WOFF), terbatas hanya pada varian yang digunakan: Amiri (Arabic & Latin 400, 700) dan Plus Jakarta Sans (Latin 400, 500, 600).

### Pemisahan Kode (*Code Splitting*) Rute:
Semua rute sekunder di-*code split* menggunakan `React.lazy()` dengan ukuran chunk terukur dari keluaran build:
- `/surah-list`: 2.99 kB (gzip: 1.33 kB)
- `/doa-list`: 3.99 kB (gzip: 1.70 kB)
- `/profile`: 5.49 kB (gzip: 1.88 kB)
- `/prayer-times`: 5.54 kB (gzip: 2.28 kB)
- `/bookmarks`: 6.09 kB (gzip: 2.35 kB)
- `/location`: 6.58 kB (gzip: 2.55 kB)
- `/dzikir`: 9.88 kB (gzip: 3.62 kB)
- `/quran-doa`: 10.93 kB (gzip: 3.45 kB)
- `/surah-detail`: 14.31 kB (gzip: 4.76 kB)
- `/data-sources`: 21.28 kB (gzip: 6.00 kB)

### Isolasi Re-render Beranda:
- Interval timer hitungan mundur sholat diisolasi ke komponen kecil `PrayerCountdown` agar pembaruan state per detik tidak memicu re-render pada seluruh pohon komponen halaman Beranda.
- **Status Metrik FPS**: Belum diukur pada profil performa DevTools perangkat fisik nyata.

---

## 3. Hasil Audit Nyata Lighthouse CLI

Pengujian dijalankan langsung terhadap server produksi `vite preview` menggunakan Lighthouse CLI dengan peramban Google Chrome headless:

- **Perintah**:
  ```bash
  npx --yes lighthouse http://localhost:4173<rute> \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
    --form-factor=mobile \
    --screenEmulation.mobile=true \
    --output=json \
    --quiet
  ```
- **Lingkungan Uji**: Google Chrome versi Windows (`C:\Program Files\Google\Chrome\Application\chrome.exe`), emulasi Mobile.
- **Tanggal Pengujian**: 24 November 2026

### Tabel Skor Terukur Lighthouse CLI (Mobile):

| Rute / Halaman | Performance | Accessibility | Best Practices | SEO | Status Uji |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/` (Beranda) | **95** | **98** | **100** | **91** | Terukur |
| `/quran/1` (Al-Qur'an Surah 1) | **87** | **100** | **100** | **91** | Terukur |
| `/doa` (Doa Harian) | **94** | **100** | **100** | **91** | Terukur |
| `/dzikir` (Dzikir Pagi-Petang) | **90** | **100** | **100** | **91** | Terukur |

*Catatan PWA:* Kategori PWA tidak menghasilkan skor persentase pada Lighthouse v12 karena Web App Manifest sengaja dinonaktifkan untuk lingkup MVP (FR terkait dialokasikan untuk Fase 2).

---

## 4. Hasil Audit Manual Pemilik Proyek

Tabel di bawah disediakan untuk verifikasi manual lanjutan menggunakan Chrome DevTools (Tab Lighthouse, Mode Mobile) pada lingkungan peramban pengguna:

| Halaman | Performance | Accessibility | Best Practices | SEO | Tanggal |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/` (Beranda) | | | | | |
| `/quran/1` (Surah 1) | | | | | |
| `/doa` (Doa Harian) | | | | | |
| `/dzikir` (Dzikir Pagi-Petang) | | | | | |
