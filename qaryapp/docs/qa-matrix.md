# Matriks QA & Audit Kualitas Aplikasi (QaryApp)

Audit awal dilakukan sebelum pengerjaan langkah 12 (kualitas, performa, offline, aksesibilitas, ketahanan).

---

## 1. Audit Ukuran Bundel (Sebelum vs Sesudah Optimasi)

### Sebelum Optimasi
- **index.html**: 1.82 kB (gzip: 0.83 kB)
- **dist/assets/index-DA0lr-ec.js (JS Awal)**: 438.36 kB (gzip: **130.71 kB**)
- **dist/assets/index-Yx4Ni9QL.css (CSS Awal)**: 64.94 kB (gzip: 17.17 kB)
- **Data Chunks Terpisah**:
  - `dist/assets/doa-CNXNR9jA.js`: 37.65 kB (gzip: 11.45 kB)
  - `dist/assets/dzikir-Be0CEHS2.js`: 41.90 kB (gzip: 8.08 kB)
- **Aset Font WOFF/WOFF2**: 31 berkas font dimuat karena impor generik memuat semua subset (vietnamese, cyrillic, latin-ext, dll.).

### Sesudah Optimasi (Langkah 12)
- **index.html**: 2.28 kB (gzip: 1.04 kB)
- **JS Awal (dist/assets/index-_QenhuZF.js)**: 315.11 kB (gzip: **98.40 kB**) — *Turun ~25% (di bawah batas 100 kB gzip)*
- **CSS Awal (dist/assets/index-BznPM1Va.css)**: 49.77 kB (gzip: **9.16 kB**) — *Turun ~46%*
- **Chunk Rute Lazy-Loaded**:
  - `quran-doa`: 10.93 kB (gzip: 3.45 kB)
  - `surah-detail`: 14.31 kB (gzip: 4.76 kB)
  - `dzikir`: 9.88 kB (gzip: 3.62 kB)
  - `bookmarks`: 6.09 kB (gzip: 2.35 kB)
  - `profile`: 5.49 kB (gzip: 1.88 kB)
  - `doa-list`: 3.99 kB (gzip: 1.70 kB)
  - `surah-list`: 2.99 kB (gzip: 1.33 kB)
  - `prayer-times`: 5.54 kB (gzip: 2.28 kB)
- **Aset Font WOFF/WOFF2**: Hanya 14 berkas (7 WOFF2 + 7 WOFF fallback) khusus subset Latin dan Arabic, menghemat puluhan request jaringan yang tidak perlu.
- **Service Worker Precaching**: 53 entries (1461.35 KiB) otomatis dipersiapkan untuk pengalaman luring penuh.

---

## 2. Matriks Rute dan Keadaan Aplikasi

| Rute | Memuat (Skeleton) | Kosong (EmptyState) | Galat (ErrorState) | Luring (Offline Banner/Cache) | Tema Terang | Tema Gelap | Lebar 360px | Lebar 390px | Lebar 768px | Lebar 1280px | Status Review Kode |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` (Beranda) | OK | OK (tanpa lokasi) | OK | OK (Pita + Cache) | OK | OK | OK (No scroll X) | OK | OK | Perlu Sidebar | Lulus |
| `/quran-doa` | OK | N/A | OK | OK (Cache surah/doa) | OK | OK | OK | OK | OK | Perlu Sidebar | Lulus |
| `/dzikir` | OK | OK | OK | OK (Data lokal JSON) | OK | OK | OK | OK | OK | Perlu Sidebar | Lulus |
| `/tersimpan` | OK | OK | OK | OK (IndexedDB) | OK | OK | OK | OK | OK | Perlu Sidebar | Lulus |
| `/profil` | OK | N/A | N/A | OK (Tamu) | OK | OK | OK | OK | OK | Perlu Sidebar | Lulus |
| `/quran` | OK | OK | OK | OK (Cache IndexedDB) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/quran/:surah` | OK | N/A | OK | OK (Cache ayat) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/doa` | OK | OK | OK | OK (Data lokal) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/doa/:id` | OK | N/A | OK | OK (Data lokal) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/lokasi` | OK | OK | OK | Terbatas (perlu koneksi) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/lokasi/negara` | OK | OK | OK | OK (Data negara lokal) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/jadwal-sholat` | OK | N/A | OK | OK (Cache kalender) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/notifikasi` | N/A | OK (Placeholder) | N/A | OK | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |
| `/profil/sumber-data` | N/A | N/A | N/A | OK (Data lisensi lokal) | OK | OK | OK | OK | OK | Perlu Kontainer | Lulus |

*Catatan: Kolom lebar layar 360-1280px dan tema terang/gelap pada tabel di atas ditinjau dari kelengkapan CSS token Tailwind dan overflow check.*

---

## 3. Daftar Temuan Berdasarkan Prioritas

### Prioritas P1 (Blocker - Harus Selesai di Langkah Ini)
1. **Tidak Ada Pemisahan Kode / Lazy Loading Rute**: Semua komponen halaman (`SurahListPage`, `SurahDetailPage`, `DoaListPage`, `BookmarksPage`, `ProfilePage`, dsb.) diimpor statis di `src/app/router.tsx`, membesarkan chunk awal menjadi ~438 KB.
2. **Tidak Ada Service Worker**: Aplikasi tidak dapat dimuat ulang saat luring (metrik PWA dan prd.md belum terpenuhi).
3. **Pemuatan Subset Font Berlebih**: Impor `@fontsource/amiri/400.css` memuat subset Cyrillic/Vietnamese yang tidak diperlukan, memperbanyak *network waterfall*.
4. **Hitungan Detik Beranda Me-render Seluruh Komponen**: `currentTime` di Beranda diperbarui tiap detik menggunakan `setInterval`, memicu *re-render* seluruh DOM beranda setiap detik.

### Prioritas P2 (Penting - Diselesaikan di Langkah Ini)
1. **Belum Ada ErrorBoundary Global dan Per-Rute**: Bila terjadi galat *unhandled exception*, seluruh aplikasi menjadi layar putih.
2. **Batas Penyimpanan / QuotaExceeded Belum Ditangani Secara Proaktif**: Fungsi cache IndexedDB belum membersihkan entri tertua saat kuota penuh.
3. **Belum Ada Skip-Link & Pengumuman Judul Aksesibilitas**: Pengguna pembaca layar (*screen reader*) harus melewati seluruh elemen navigasi berulang kali.
4. **Token `--color-danger-soft` dan `--color-skeleton` Belum Masuk `@theme`**: Belum ada jaminan rasio kontras otomatis di mode terang dan gelap.
5. **Rute 404 Belum Menangani Surah/Doa Invalid Secara Otomatis**: Misal `/quran/999` atau `/doa/xyz`.

### Prioritas P3 (Peningkatan & Rekomendasi Masa Depan)
1. Fitur unduh Al-Qur'an 30 juz penuh untuk penggunaan luring total (diusulkan untuk Fase 2).
2. Verifikasi perilaku pada perangkat fisik iOS/Safari asli (misalnya Safari gesture swipe back dan safe area inset notch dinamis).
