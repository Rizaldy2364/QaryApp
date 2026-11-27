# PRD QaryApp

Product Requirements Document · Versi 1.1 · 19 November 2026 · Status: Draft (disesuaikan dengan desain visual)

## 1. Ringkasan Produk

QaryApp adalah aplikasi web pendamping ibadah harian yang bersih, cepat, dan bebas gangguan (distraction-free). Pengguna dapat melihat jadwal sholat sesuai lokasi, membaca Al-Qur'an lengkap dengan terjemahan dan audio murotal, serta mengamalkan doa dan dzikir harian dalam satu aplikasi yang ringan.

Tahap pertama dibangun sebagai **web responsive (mobile-first)**. Jika hasilnya bagus, tahap berikutnya menambahkan kemampuan install/download (PWA, lalu APK jika diperlukan) tanpa menulis ulang aplikasi.

Pengguna tidak terbatas di Indonesia: lokasi dapat dipilih dari berbagai negara. Seluruh fitur inti dapat dipakai tanpa login; akun bersifat opsional dan dikerjakan setelah MVP.

## 2. Latar Belakang dan Masalah

Aplikasi ibadah yang ada umumnya sudah lengkap, tetapi sering mengganggu: iklan, notifikasi berlebihan, ukuran besar, atau tampilan yang padat. Pengguna butuh satu tempat yang cepat dibuka, fokus pada ibadah, dan tetap berguna saat koneksi buruk.

Masalah yang diselesaikan:

- Pengguna berpindah-pindah aplikasi untuk jadwal sholat, Al-Qur'an, dan doa.
- Tampilan aplikasi lain terlalu ramai, terutama saat dibaca malam hari.
- Konten statis (doa, dzikir) sering tidak bisa dibuka tanpa internet.

## 3. Tujuan dan Non-Tujuan

### Tujuan

1. Menyediakan jadwal sholat akurat berdasarkan lokasi pengguna, di Indonesia maupun negara lain.
2. Menyediakan pengalaman membaca Al-Qur'an yang nyaman (teks Arab, terjemahan Indonesia, audio).
3. Menyediakan doa harian dan dzikir pagi-petang yang bisa diakses offline.
4. Tampilan bersih, responsif, dan mendukung mode gelap/terang.
5. Selesai sebagai MVP dalam 2 minggu.

### Non-Tujuan (di luar MVP)

- Login dan sinkronisasi antar perangkat (login bersifat opsional dan dikerjakan setelah MVP; lihat bagian 13).
- Notifikasi dan adzan otomatis (halamannya sudah didesain, tetapi fungsinya baru aktif setelah PWA atau APK; lihat bagian 13).
- Arah kiblat dengan sensor kompas.
- Fitur sosial, komunitas, atau konten berbayar.
- Iklan.

## 4. Target Pengguna

**Pengguna utama:** umat Muslim di Indonesia dan luar negeri, usia remaja hingga dewasa, yang mengakses lewat HP.

**Persona singkat:**

- **Pekerja/mahasiswa sibuk:** ingin cek waktu sholat cepat dan membaca beberapa ayat di sela aktivitas.
- **Pembaca malam:** membaca Al-Qur'an atau dzikir menjelang tidur, butuh mode gelap yang nyaman.
- **Pengguna dengan sinyal terbatas:** butuh doa dan dzikir tetap terbuka tanpa internet.

## 5. Ruang Lingkup MVP

| Modul | Prioritas | Minggu |
| --- | --- | --- |
| Setup proyek dan layout dasar | Wajib | 1 |
| Jadwal Sholat + deteksi lokasi | Wajib | 1 |
| Daftar Surah dan Baca Al-Qur'an | Wajib | 1 |
| Doa Harian | Wajib | 2 |
| Dzikir Pagi-Petang | Wajib | 2 |
| Bookmark ayat | Sebaiknya ada | 2 |
| Mode gelap/terang | Wajib | 2 |
| Cache offline | Sebaiknya ada | 2 |
| Deploy (Vercel/Netlify) | Wajib | 2 |
| Pilih Lokasi dan Pilih Negara | Wajib | 1 |
| Halaman Qur'an & Doa (kartu informasi bergeser) | Wajib | 2 |
| Profil dan Pengaturan (sebagai tamu) | Wajib | 2 |
| Jadwal Sholat detail dan pencatatan sholat (lokal) | Sebaiknya ada | 2 |
| Notifikasi, pengingat, dan adzan | Fase 2 | Setelah MVP |
| Login, daftar, sinkronisasi, dan Bagikan aplikasi | Fase 2 | Setelah MVP |

## 6. Kebutuhan Fungsional

### 6.1 Jadwal Sholat

- **FR-1.1** Aplikasi meminta izin lokasi (GPS) dan menampilkan jadwal Imsak, Subuh, Dzuhur, Ashar, Maghrib, dan Isya untuk hari ini.
- **FR-1.2** Jika izin lokasi ditolak atau gagal, pengguna dapat memilih negara lalu kota secara manual; pilihan terakhir disimpan.
- **FR-1.3** Aplikasi menyorot waktu sholat berikutnya serta menampilkan hitungan mundur dan bilah progres menuju waktu tersebut. Menekan kartu ini membuka Jadwal Sholat (lihat 6.10).
- **FR-1.4** Tanggal Masehi dan Hijriah ditampilkan.
- **FR-1.5** Jadwal hari yang sama di-cache agar tetap tampil saat offline.

**Kriteria penerimaan:** jadwal tampil kurang dari 3 detik pada koneksi normal; saat offline, jadwal terakhir yang tersimpan tetap tampil dengan penanda "data tersimpan".

### 6.2 Daftar Surah

- **FR-2.1** Menampilkan 114 surah dengan nomor, nama Arab, nama Latin, arti, jumlah ayat, dan tempat turun.
- **FR-2.2** Pencarian surah berdasarkan nama atau nomor.
- **FR-2.3** Daftar di-cache setelah pemuatan pertama.

### 6.3 Baca Al-Qur'an

- **FR-3.1** Halaman surah menampilkan per ayat: teks Arab, transliterasi (jika tersedia), dan terjemahan Indonesia.
- **FR-3.2** Pengguna dapat menyalakan atau mematikan terjemahan.
- **FR-3.3** Pengguna dapat mengatur ukuran teks Arab (minimal 3 tingkat).
- **FR-3.4** Audio murotal dapat diputar per ayat atau per surah sesuai yang disediakan API, dengan kontrol putar/jeda dan lanjut otomatis ke ayat berikutnya.
- **FR-3.5** Tafsir singkat dapat dibuka per ayat jika tersedia dari API.
- **FR-3.6** Surah yang pernah dibuka di-cache untuk dibaca offline (audio tidak wajib offline).
- **FR-3.7** Aplikasi mengingat posisi bacaan terakhir dan menawarkan "Lanjutkan membaca" di beranda.

### 6.4 Bookmark Ayat

- **FR-4.1** Pengguna dapat menandai atau membatalkan bookmark pada ayat mana pun.
- **FR-4.2** Halaman "Tersimpan" memiliki tab Ayat dan Doa; tab Ayat menampilkan daftar bookmark dan membuka langsung ke ayat terkait, tab Doa menampilkan doa favorit. Jika kosong, tampil ajakan membuka Al-Qur'an.
- **FR-4.3** Bookmark bisa dipakai tanpa login; datanya disimpan lokal di perangkat (IndexedDB).

### 6.5 Doa Harian

- **FR-5.1** Daftar doa dikelompokkan per kategori (misalnya bangun tidur, makan, masuk masjid, bepergian).
- **FR-5.2** Setiap doa menampilkan teks Arab, transliterasi, dan arti dalam bahasa Indonesia.
- **FR-5.3** Pencarian doa berdasarkan judul atau kategori.
- **FR-5.4** Data berasal dari file `doaharian.json` lokal sehingga sepenuhnya offline.
- **FR-5.5** Pengguna dapat menandai doa favorit.

### 6.6 Dzikir Pagi dan Petang

- **FR-6.1** Tab terpisah untuk dzikir pagi dan dzikir petang.
- **FR-6.2** Setiap dzikir menampilkan teks Arab, arti, dan jumlah pengulangan.
- **FR-6.3** Penghitung (counter) tap untuk melacak pengulangan per dzikir; reset per sesi.
- **FR-6.4** Aplikasi menyarankan tab yang sesuai dengan waktu saat ini (pagi atau petang).
- **FR-6.5** Data dari file JSON lokal (offline).

### 6.7 Tampilan dan Pengaturan

- **FR-7.1** Mode terang, gelap, dan ikut sistem; pilihan disimpan.
- **FR-7.2** Pengaturan ukuran teks Arab berlaku di seluruh aplikasi.
- **FR-7.3** Lokasi (negara dan kota) dapat diubah dari Profil lalu Pengaturan, atau dengan menekan nama kota di Beranda dan Jadwal Sholat.

### 6.8 Lokasi dan Negara

- **FR-8.1** Halaman Pilih Lokasi menampilkan lokasi saat ini (otomatis dari GPS atau dipilih manual), tombol Gunakan lokasi saya, kolom cari kota, dan baris Negara.
- **FR-8.2** Pengguna dapat memilih negara dari daftar yang bisa dicari (halaman Pilih Negara); daftar kota menyesuaikan negara terpilih.
- **FR-8.3** Halaman ini dibuka dari nama kota di Beranda, nama kota di Jadwal Sholat, dan Profil lalu Pengaturan lalu Lokasi; halaman ini juga tampil otomatis saat izin GPS ditolak atau gagal.
- **FR-8.4** Metode perhitungan jadwal menyesuaikan negara (Kemenag untuk Indonesia, metode lain untuk negara lain); pemetaan negara ke metode ditetapkan sebelum integrasi.
- **FR-8.5** Halaman menampilkan catatan bahwa lokasi hanya dipakai untuk menghitung jadwal sholat.

### 6.9 Halaman Qur'an & Doa

- **FR-9.1** Menu Qur'an & Doa di bottom bar membuka halaman gabungan sebagai pintu masuk ke Al-Qur'an (daftar surah dan halaman baca) dan Doa Harian.
- **FR-9.2** Di bagian atas ada kartu informasi yang bergeser otomatis setiap 5 sampai 10 detik dan dapat digeser manual: ayat pilihan, doa pilihan, dan kata bermanfaat, masing-masing dengan gambar latar dan penanda titik halaman.
- **FR-9.3** Isi kartu berasal dari file JSON lokal dan sumbernya diverifikasi; teks di atas gambar latar harus tetap terbaca (kontras minimal 4,5:1).
- **FR-9.4** Daftar Surah dan Doa Harian dibuka dari halaman ini dan memakai panah kembali, tanpa bottom bar.

### 6.10 Jadwal Sholat Detail dan Pencatatan

- **FR-10.1** Menekan kartu Sholat berikutnya di Beranda membuka Jadwal Sholat: lima waktu (Subuh, Dzuhur, Ashar, Maghrib, Isya) dengan jam dan status masing-masing.
- **FR-10.2** Pengguna dapat menandai sholat sudah dilaksanakan; aplikasi mencatat jam penandaan dan menampilkan ringkasan jumlah sholat yang dilaksanakan hari itu (data lokal di perangkat).
- **FR-10.3** Bagian Pengingat (`#pengingat`) berisi saklar aktif/nonaktif dan pilihan *Notifikasi saja* atau *Notifikasi + Adzan*. Pengingat dan adzan saat **aplikasi sedang terbuka** sudah aktif di web; pengingat saat **aplikasi tertutup** menunggu versi aplikasi Android (Capacitor) karena keterbatasan web dan privasi lokasi.

### 6.11 Notifikasi (Web: saat aplikasi terbuka; Latar belakang: Fase 2 Android)

- **FR-11.1** Ikon lonceng di Beranda membuka halaman Notifikasi (`/notifikasi`): daftar dikelompokkan *Hari ini*, *Kemarin*, dan *Sebelumnya* (waktu sholat, dzikir pagi/petang, renungan harian), penanda belum dibaca, dan tautan *Tandai semua dibaca*.
- **FR-11.2** Titik penanda merah (`--color-danger`) pada lonceng Beranda muncul bila jumlah notifikasi belum dibaca lebih dari nol.
- **FR-11.3** Baris *Atur pengingat sholat* mengarah ke bagian Pengingat di Jadwal Sholat (`/jadwal-sholat#pengingat`). Pengingat latar belakang saat aplikasi tertutup menunggu versi Android.

### 6.12 Profil dan Akun (akun: Fase 2 — Aktif di Web)

- **FR-12.1** Menu Profil (pojok kanan bottom bar) membuka halaman Profil: untuk tamu menampilkan tombol Masuk dan Daftar aktif menuju `/masuk` dan `/daftar`, serta Pengaturan (tema, ukuran teks Arab, lokasi).
- **FR-12.2** Setelah masuk: kartu akun (inisial avatar, nama, email, status sinkronisasi awan), Pengaturan, Bagikan aplikasi (tautan web; APK ditambahkan setelah tersedia), tombol Keluar (dengan opsi hapus bookmark/favorit lokal), dan opsi Hapus akun.
- **FR-12.3** Login bersifat opsional; pengguna tetap dapat memakai seluruh fitur inti sebagai tamu tanpa panggilan ke server akun/sinkronisasi (lihat aturan login opsional di bagian 13).

## 7. Kebutuhan Non-Fungsional

- **Performa:** halaman utama interaktif kurang dari 2,5 detik pada jaringan 4G; target skor Lighthouse Performance 90 ke atas.
- **Responsif:** mobile-first; didukung lebar layar 360 px hingga desktop.
- **Offline:** konten statis (doa, dzikir) dan data yang pernah dibuka tetap bisa diakses tanpa internet.
- **Aksesibilitas:** kontras teks memadai di kedua tema, target sentuh minimal 44 px, label ARIA pada kontrol utama.
- **Privasi:** lokasi hanya dipakai untuk menghitung jadwal sholat; tidak ada pelacakan pihak ketiga dan tidak ada iklan.
- **Ketahanan:** jika API gagal, tampilkan pesan yang jelas dan data cache bila ada.
- **Kompatibilitas:** Chrome, Safari, Firefox, dan Edge dua versi terakhir.

## 8. Arsitektur dan Tech Stack

- **Frontend:** React + Vite, Tailwind CSS v4, Lucide React.
- **Font:** Amiri (teks Arab), Plus Jakarta Sans (UI).
- **Penyimpanan lokal:** LocalStorage untuk pengaturan sederhana; IndexedDB untuk cache surah dan bookmark.
- **Backend:** tidak diperlukan di MVP (aplikasi sepenuhnya client-side). Fastify + PostgreSQL/Kysely disiapkan sebagai opsi di fase akun pengguna.
- **Hosting:** Vercel atau Netlify.

### Sumber Data

| Data | Sumber | Catatan |
| --- | --- | --- |
| Jadwal sholat | Aladhan API (`timingsByCity` dan versi koordinat) | Pilih metode perhitungan Kemenag. Catatan awal menyebut method 11; kode metode Kemenag perlu diverifikasi di dokumentasi Aladhan sebelum integrasi |
| Surah, ayat, terjemahan, audio | EQuran.id API v2 | Endpoint daftar surah dan detail surah per nomor |
| Doa harian dan dzikir | File JSON lokal | Disusun sendiri atau dari repositori publik; periksa lisensi dan validasi sumber teks |

## 9. Navigasi dan Struktur Halaman

- **Beranda:** jadwal sholat hari ini, hitungan mundur sholat berikutnya, "Lanjutkan membaca", pintasan ke doa dan dzikir, ikon lonceng (Notifikasi) di kanan atas, nama kota yang dapat ditekan untuk mengganti lokasi, dan kartu sholat berikutnya yang membuka Jadwal Sholat.
- **Qur'an & Doa:** halaman gabungan sebagai pintu masuk ke Al-Qur'an (daftar surah dan halaman baca) dan Doa Harian, dengan kartu informasi yang bergeser otomatis setiap 5 sampai 10 detik (ayat pilihan, doa pilihan, kata bermanfaat) berlatar gambar.
- **Doa Harian:** daftar kategori dan detail doa; dibuka dari halaman Qur'an & Doa.
- **Dzikir:** tab pagi dan petang dengan counter.
- **Tersimpan:** bookmark ayat dan doa favorit.
- **Profil:** untuk tamu: tombol Masuk dan Daftar serta Pengaturan (tema, ukuran teks Arab, lokasi); setelah masuk: data akun, Bagikan aplikasi, dan Keluar.

Pada layar HP, navigasi utama berupa bottom navigation bar dengan 5 menu: Beranda, Qur'an & Doa, Dzikir, Tersimpan, dan Profil (di pojok kanan). Menu aktif ditandai lingkaran hijau yang menonjol di atas bar dengan lekukan di belakangnya. Halaman turunan tanpa bottom bar (Daftar Surah, Baca Surah, Doa Harian, Detail Doa, Pilih Lokasi, Pilih Negara, Jadwal Sholat, Notifikasi) memakai panah kembali di pojok kiri atas. Judul halaman selalu rata tengah. Pada layar lebar, bottom bar berubah menjadi sidebar.

## 10. Prinsip Desain UI/UX

- Bersih dan tenang: banyak ruang kosong, warna lembut, satu warna aksen.
- Teks Arab menjadi fokus: Amiri dengan line-height lega dan ukuran dapat diatur.
- Mode gelap sebagai warga kelas satu, bukan tambahan; nyaman dibaca malam hari.
- Tanpa pop-up, tanpa iklan, tanpa elemen yang mengganggu.
- Ikon antarmuka minimalis dari Lucide React; ikon aplikasi berupa buku terbuka dan bulan sabit di atas latar hijau ketupat.

Detail visual ada di `desain.md`.

## 11. Metrik Keberhasilan

- Semua modul wajib berfungsi di HP dan desktop pada akhir minggu 2.
- Skor Lighthouse Performance, Accessibility, dan Best Practices masing-masing 90 ke atas.
- Jadwal sholat sesuai dengan jadwal Kemenag untuk kota uji (selisih maksimal 1 menit).
- Halaman utama, doa, dan dzikir dapat dibuka dalam mode offline setelah kunjungan pertama.
- Umpan balik dari minimal 5 pengguna uji tanpa bug blocker.

## 12. Rencana Pengerjaan (2 Minggu)

### Minggu 1

- Setup React + Vite + Tailwind v4, struktur folder, routing, layout, dan tema dasar.
- Integrasi Aladhan: jadwal sholat, deteksi lokasi, pilih negara dan kota manual.
- Integrasi EQuran.id: daftar surah dan halaman baca surah.

### Minggu 2

- Doa harian dan dzikir pagi-petang dari JSON lokal, termasuk counter.
- Bookmark, mode gelap/terang, pengaturan ukuran teks, cache offline, halaman Qur'an & Doa dengan kartu informasi, Profil dan Pengaturan, serta pencatatan sholat dilaksanakan (lokal).
- Polishing UI/UX, pengujian responsif di HP, perbaikan bug, deploy ke Vercel/Netlify.

## 13. Roadmap Setelah MVP

1. **PWA:** manifest, service worker, ikon, dan tombol "Install" agar bisa diunduh dari browser.
2. **Notifikasi waktu sholat:** pusat notifikasi dan pengingat dengan pilihan Notifikasi saja atau Notifikasi + Adzan, setelah PWA stabil.
3. **APK Android:** membungkus web app dengan Capacitor bila dibutuhkan distribusi lewat file atau Play Store; tautan APK ditambahkan ke menu Bagikan aplikasi.
4. **Login opsional** untuk sinkronisasi bookmark dan riwayat bacaan antar perangkat (Fastify + PostgreSQL/Kysely; opsi paling ringan: Masuk dengan Google).
5. **Arah kiblat, Asmaul Husna, dan pelacak target bacaan.**

Keputusan desain yang menjaga jalur ini tetap mudah: seluruh logika berjalan di client, aset disajikan statis, dan penyimpanan data dipisahkan dalam satu lapisan sehingga mudah diganti.

**Aturan login opsional:** semua fitur, termasuk bookmark, tetap bisa dipakai tanpa login. Login hanya menambah sinkronisasi dan cadangan data antar perangkat (bookmark, doa favorit, dan posisi baca terakhir; lokasi dan catatan sholat tetap di perangkat). Saat pertama kali login, data lokal dan server digabung berdasarkan kunci (`surah:ayat` untuk bookmark, `doaId` untuk favorit) dengan aturan *updatedAt* terbaru menang dan penanda hapus dihormati. Aplikasi menampilkan ajakan ringan di halaman Tersimpan (bukan pemblokir, dan dapat ditutup selama 14 hari) agar pengguna login supaya bookmark aman dari penghapusan data browser.

## 14. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| API pihak ketiga lambat atau down | Fitur inti tidak tampil | Cache lokal dan pesan kesalahan yang jelas |
| Kode metode perhitungan salah atau berbeda tiap negara | Jadwal tidak sesuai Kemenag atau otoritas setempat | Verifikasi dokumentasi, tetapkan metode bawaan per negara, dan bandingkan dengan jadwal resmi |
| Izin lokasi ditolak | Jadwal tidak otomatis | Pilihan kota manual sebagai cadangan |
| Ketepatan teks doa dan dzikir | Kesalahan konten keagamaan | Gunakan sumber tepercaya dan minta tinjauan sebelum rilis |
| Lisensi data atau audio | Masalah hak pakai | Periksa ketentuan tiap sumber dan cantumkan atribusi |
| Jadwal 2 minggu terlalu ketat | Fitur tertunda | Prioritaskan modul wajib; bookmark, offline penuh, dan modul Fase 2 (notifikasi, akun) bisa mundur |
| Cakupan fitur bertambah dari desain (notifikasi, akun, multi-negara) | Target 2 minggu tidak tercapai | Fase 2 untuk notifikasi dan akun; MVP tetap web dengan data lokal |

## 15. Pertanyaan Terbuka

1. Daftar negara dan kota: pencarian bebas lewat API atau daftar tetap, dan metode perhitungan bawaan tiap negara?
2. Qari audio default yang dipilih?
3. Apakah transliterasi Latin ayat wajib ada di MVP?
4. Sumber final data doa dan dzikir, dan siapa yang meninjau kebenaran teksnya?
5. Ikon aplikasi (buku terbuka dengan bulan sabit) sudah dirancang: apakah disetujui sebagai logo final?