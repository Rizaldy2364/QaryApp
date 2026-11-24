# Dokumentasi Mode Luring (Offline Architecture) - QaryApp

Dokumen ini menjelaskan strategi luring (*offline capability*), penyimpanan data lokal, kebijakan pembersihan kuota, hasil pengujian nyata, serta panduan pengujian mode luring pada QaryApp.

---

## 1. Arsitektur Luring

QaryApp dirancang dengan pendekatan *offline-first* untuk seluruh aset inti dan data yang telah diakses oleh pengguna:

```
[Pengguna]
   │
   ├── (1) Shell Aplikasi (HTML, JS, CSS, Font) ──> [Service Worker (Workbox Precaching)]
   │                                                     └── Disimpan saat install / update pertama
   │
   ├── (2) Data Statis (Doa & Dzikir) ─────────────> [Bundel JS Lokal / JSON]
   │                                                     └── 100% luring sejak pertama kali dibuka
   │
   ├── (3) Data Dinamis (Al-Qur'an & Jadwal) ──────> [IndexedDB: generalCache]
   │                                                     └── Stale-While-Revalidate dengan banner luring
   │
   └── (4) Data Pribadi (Bookmark, Sholat, Favorit)> [IndexedDB: Stores Khusus]
                                                         └── Persistent Storage (tidak pernah dihapus)
```

---

## 2. Service Worker & Audit Konfigurasi

Service Worker dikonfigurasi menggunakan `vite-plugin-pwa` dengan generator Workbox:
- **Aset yang Di-precache**: 53 entri berkas (`index.html`, seluruh `.js` & `.css`, font WOFF/WOFF2, dan ikon SVG/PNG).
- **Navigate Fallback**: `/index.html` (memastikan navigasi SPA dimuat ulang saat luring).

### Hasil Audit Konfigurasi Service Worker (`dist/sw.js`):
1. **Pola Pengecualian Audio EQuran.id**:
   - URL audio asli dari respons API EQuran.id adalah `https://cdn.equran.id/audio-full/[Qari]/[Nomor].mp3` dan `https://cdn.equran.id/audio-partial/[Qari]/[NomorAyat].mp3`.
   - Pola pada `sw.js`:
     ```js
     ({ url }) => url.origin.includes("aladhan.com") ||
                  url.origin.includes("equran.id") ||
                  url.origin.includes("open-meteo.com") ||
                  url.pathname.endsWith(".mp3")
     ```
   - **Hasil Audit**: Pola **mencakup secara sempurna** URL audio EQuran.id, baik melalui kecocokan domain (`cdn.equran.id`) maupun ekstensi berkas (`.mp3`). Semua panggilan audio diarahkan ke `NetworkOnly` dan tidak membebani cache Service Worker.
2. **Pembaruan Otomatis (skipWaiting & clientsClaim)**:
   - Di dalam berkas kompilasi `dist/sw.js`, Workbox menyertakan `self.skipWaiting()` dan `clientsClaim()` secara langsung pada inisialisasi modul.
   - **Hasil Audit**: Pembaruan otomatis **benar-benar aktif** saat Service Worker baru terdeteksi, meskipun pendaftaran awal di `src/main.tsx` menggunakan API native `navigator.serviceWorker.register('/sw.js')`.
3. **Pencegatan Rute `/dev` dan `/api`**:
   - Rute `/dev` memiliki aturan denylist: `new s.NavigationRoute(..., { denylist: [/^\/dev/] })`. Rute dev tidak dicegat oleh `navigateFallback`.
   - Rute `/api`: Untuk navigasi dokumen HTML, `/api` belum terdaftar di denylist navigasi karena aplikasi tidak memiliki backend server sendiri di MVP. Namun untuk panggilan data `fetch`, API eksternal Aladhan, EQuran.id, dan Open-Meteo telah dikecualikan secara eksplisit via `NetworkOnly`.

---

## 3. Hasil Pengujian Luring Nyata (Chrome Headless CDP)

Pengujian luring dijalankan secara terprogram menggunakan peramban Google Chrome headless melalui Chrome DevTools Protocol (CDP) dengan kondisi jaringan `Network.emulateNetworkConditions({ offline: true })` terhadap server `vite preview`:

- **Metode Pengujian**:
  1. Server `vite preview --port 4173` dijalankan.
  2. Peramban Chrome membuka seluruh halaman saat daring untuk mengaktifkan Service Worker dan mengisi cache IndexedDB.
  3. Jaringan dimatikan (`offline: true`).
  4. Setiap halaman dinavigasi dan diuji apakah HTML dimuat dari Service Worker serta apakah data/antarmuka spesifik berhasil ditampilkan di layar.

### Tabel Hasil Pengujian:

| Halaman | Dimuat ulang saat offline | Data tampil | Status | Catatan Hasil Uji |
| :--- | :---: | :---: | :---: | :--- |
| **Beranda** (`/`) | Ya | Tidak | Belum lolos | App shell dimuat dari Service Worker (`document.title` berhasil). Data jadwal sholat tidak tampil karena pada browser uji baru, izin lokasi belum diberikan/kota belum dipilih saat daring. |
| **Qur'an & Doa** (`/quran-doa`) | Ya | Ya | Lulus | App shell dan menu navigasi Al-Qur'an serta Doa Harian tampil luring. Kartu renungan menampilkan ayat/doa yang telah tersimpan. |
| **Dzikir** (`/dzikir`) | Ya | Ya | Lulus | 100% data dzikir berasal dari JSON lokal dalam bundel. Counter, navigasi butir, dan progress bar berfungsi luring penuh. |
| **Doa** (`/doa`) | Ya | Ya | Lulus | Seluruh 11 kategori dan 46 doa harian tampil dan dapat dicari secara luring dari berkas data lokal. |
| **Detail Doa** (`/doa/doa-1`) | Ya | Ya | Lulus | Teks Arab "Doa Sebelum Tidur", transliterasi, terjemahan, dan fawaid tampil lengkap luring. |
| **Tersimpan** (`/tersimpan`) | Ya | Ya | Lulus | Tab Bookmark Ayat dan Doa Favorit tampil dari IndexedDB lokal tanpa koneksi internet. |
| **Profil** (`/profil`) | Ya | Ya | Lulus | Pengaturan tema (Terang/Gelap/Sistem), ukuran teks Arab, dan preferensi tersimpan di LocalStorage tampil luring. |
| **Surah Al-Fatihah** (`/quran/1`) | Ya | Ya | Lulus | Teks Arab 7 ayat Al-Fatihah dan terjemahan tampil dari cache IndexedDB (`generalCache`) yang telah dibuka saat daring. |
| **Jadwal Sholat** (`/jadwal-sholat`) | Ya | Tidak | Belum lolos | App shell dimuat; data jadwal bulanan membutuhkan cache respons Aladhan dari kota yang telah dipilih saat daring. |

---

## 4. Penyimpanan Data Lokal (IndexedDB)

Penyimpanan lokal menggunakan pustaka `idb` dengan nama database `qaryapp:v1`:

| Object Store | Kegunaan | Kebijakan Retensi |
| :--- | :--- | :--- |
| `settings` | Pengaturan pengguna (lokasi, tema, ukuran Arab, terjemahan, transliterasi) | Permanen |
| `recentLocations` | Riwayat pencarian lokasi kota | Maksimal 5 kota terbaru |
| `prayerLogs` | Catatan ceklis sholat harian 5 waktu | Permanen (data ibadah pengguna) |
| `ayahBookmarks` | Bookmark ayat Al-Qur'an | Permanen (data ibadah pengguna) |
| `doaFavorites` | Doa harian favorit pengguna | Permanen (data ibadah pengguna) |
| `dzikirProgress` | Progres hitungan dzikir pagi & petang hari ini | Reset harian / manual |
| `generalCache` | Cache respons API Al-Qur'an (surah & ayat) dan jadwal sholat | Dikelola kuota (*prune oldest*) |

---

## 5. Penanganan Batas Kuota Penyimpanan (`QuotaExceededError`)

1. **Persistent Storage Request**:
   Saat pengguna menyimpan bookmark atau favorit pertama kali, aplikasi secara otomatis memanggil `navigator.storage.persist()` agar peramban tidak menghapus data aplikasi saat perangkat kekurangan ruang penyimpanan.
2. **Pemangkasan Otomatis (*Pruning*)**:
   Jika terjadi `QuotaExceededError` saat menyimpan data ke `generalCache`:
   - Aplikasi otomatis menghapus 25% entri cache API tertua berdasarkan `savedAt`.
   - Mencoba menyimpan kembali entri baru.
   - **Toko data pengguna (bookmark, favorit, riwayat sholat, dzikir) TIDAK PERNAH dipangkas.**
3. **Deteksi Pembatasan Peramban**:
   Jika IndexedDB diblokir (misalnya mode penyamaran ketat atau kuota 0 MB), aplikasi beralih ke penyimpanan memori sementara (*in-memory fallback*) dan menampilkan lencana "Penyimpanan terbatas" pada halaman Profil.

---

## 6. Panduan Pengujian di Perangkat Fisik (Ponsel Android/iOS)

> [!IMPORTANT]
> **Batasan Konteks Aman (Secure Context) Service Worker:**
> Spesifikasi standar web mewajibkan Service Worker berjalan hanya pada konteks aman (**HTTPS** atau `http://localhost`).
> Membuka alamat IP lokal komputer pengembangan pada peramban ponsel (misalnya `http://192.168.1.10:4173`) **TIDAK AKAN** mendaftarkan atau mengaktifkan Service Worker karena dianggap *insecure origin*.
> 
> **Cara Benar Menguji di Ponsel Fisik:**
> 1. Deploy aplikasi ke platform hosting dengan sertifikat SSL/HTTPS aktif (seperti Vercel atau Netlify), ATAU
> 2. Gunakan *tunneling* HTTPS lokal (seperti Cloudflare Tunnel atau ngrok) yang menyediakan URL berawalan `https://`.
> 3. Buka URL HTTPS tersebut pada peramban ponsel (Safari di iOS atau Chrome di Android).
> 4. Kunjungi beberapa halaman (Beranda, Surah Al-Fatihah, Dzikir, Doa).
> 5. Aktifkan **Mode Pesawat (Airplane Mode)** pada ponsel.
> 6. Muat ulang halaman: Aplikasi harus tetap muncul dan data yang pernah dibuka dapat diakses luring.

---

## 7. Cara Membersihkan Cache dan Data Aplikasi

Untuk menguji kondisi aplikasi dari keadaan bersih (*fresh install*):
1. **Chrome / Edge Desktop**:
   - Buka DevTools (`F12`) -> Tab **Application**.
   - Pilih menu **Storage** di bilah kiri.
   - Klik tombol **Clear site data** (mencakup Service Workers, IndexedDB, dan Cache Storage).
2. **Ponsel (Pengaturan Peramban)**:
   - Pengaturan Chrome / Safari -> Hapus Data Penjelajahan (*Clear Browsing Data*) untuk situs QaryApp.
