# agent.md — Panduan AI Agent untuk QaryApp

Dokumen ini berisi hal yang wajib diperhatikan AI agent setiap kali menjalankan prompt di proyek QaryApp. Baca seluruhnya sebelum mengerjakan tugas apa pun. Jika ada konflik antara dokumen ini dan instruksi terbaru dari pemilik proyek, ikuti instruksi terbaru, lalu beri tahu bahwa dokumen ini perlu diperbarui.

QaryApp adalah aplikasi pendamping ibadah harian: jadwal sholat, Al-Qur'an, doa, dan dzikir. Tampilannya bersih, cepat, dan bebas gangguan. Tahap pertama berupa web responsive (mobile-first); PWA dan APK menyusul setelah MVP.

---

## 1. Cara Bekerja (urutan wajib)

1. **Pahami dulu, jangan langsung menulis kode.** Pemilik proyek pernah menegaskan hal ini. Sebelum mengerjakan tugas, ringkas pemahamanmu dalam beberapa kalimat: apa yang diminta, halaman atau modul mana yang terkena, dan apa yang tidak akan diubah.
2. **Baca sumber kebenaran** (bagian 2) yang relevan dengan tugas.
3. **Tanyakan hal yang ambigu**, tetapi hanya yang memang mengubah hasil. Ajukan satu pertanyaan singkat per kali. Jika masih bisa dikerjakan dengan asumsi aman, kerjakan dan tulis asumsinya dalam satu kalimat.
4. **Kerjakan satu halaman atau satu modul per tugas.** Jangan menggabungkan banyak halaman dalam satu perubahan besar.
5. **Verifikasi hasilnya** memakai daftar di bagian 13 sebelum menyatakan selesai.
6. **Laporkan singkat** dengan format di bagian 14.

## 2. Sumber Kebenaran

Berkas acuan di repositori (letakkan di folder yang sama dengan file ini):

- **`prd.md`**: cakupan fitur, kebutuhan fungsional (FR-x.x), fase, risiko.
- **`desain.md`**: warna, tipografi, jarak, komponen, navigasi, keadaan khusus, dan daftar halaman yang sudah didesain.
- **Desain di kanvas** (artboard per halaman): acuan tampilan. Tautan: https://claude.ai/artifact/5AaADrahqiUFtZAGuE6sZK (hanya bisa dibuka oleh akun yang punya akses).

Urutan rujukan saat ada perbedaan:

1. Instruksi terbaru dari pemilik proyek di percakapan.
2. `prd.md`.
3. `desain.md`.
4. Desain di kanvas.

Jika rujukan saling bertentangan, atau sebuah halaman belum ada desainnya (lihat bagian 13 di `desain.md`), **jangan menebak**. Tanyakan, atau ikuti pola halaman terdekat yang sudah ada dan tandai asumsinya.

## 3. Lingkup: MVP dan Fase 2

**MVP (web, data lokal, tanpa login):**

- Beranda, jadwal sholat, pilih lokasi dan negara.
- Qur'an & Doa (halaman gabungan dengan kartu informasi), Daftar Surah, Baca Surah.
- Doa Harian, Dzikir Pagi-Petang (dengan penghitung).
- Tersimpan (bookmark ayat dan doa favorit, disimpan lokal).
- Profil sebagai tamu dan Pengaturan (tema, ukuran teks Arab, lokasi).
- Jadwal Sholat detail dengan pencatatan sholat dilaksanakan (lokal).
- Mode gelap/terang, cache offline.

**Fase 2 (jangan dikerjakan kecuali diminta):**

- Notifikasi, pengingat sholat, dan adzan (butuh PWA atau APK).
- Login, daftar, sinkronisasi, Bagikan aplikasi, dan Keluar.
- Pembungkus APK (Capacitor).

Halaman Fase 2 sudah ada desainnya, tetapi di MVP tombol terkait ditampilkan sebagai "segera hadir" atau disembunyikan. **Jangan menambah fitur di luar PRD** tanpa persetujuan.

## 4. Tech Stack dan Aturan Teknis

- Frontend: React + Vite, Tailwind CSS v4, Lucide React.
- Font: Amiri (teks Arab) dan Plus Jakarta Sans (antarmuka), dengan font cadangan (serif untuk Arab, sans-serif untuk UI).
- Penyimpanan lokal: LocalStorage untuk pengaturan sederhana, IndexedDB untuk cache surah dan bookmark.
- Backend: tidak ada di MVP. Aplikasi sepenuhnya client-side.
- Hosting: Vercel atau Netlify.

Aturan:

- Satu komponen untuk satu tanggung jawab. Jangan menyalin-tempel markup yang sama di banyak halaman; buat komponen bersama (bottom bar, bilah atas, kartu, baris daftar, chip, tab, tombol).
- Pisahkan lapisan penyimpanan (bookmark, pengaturan, cache) dalam satu modul agar mudah diganti saat akun ditambahkan.
- Jangan menambah dependensi baru tanpa alasan jelas. Sebutkan alasannya jika menambah.
- Jangan memakai `localStorage` secara langsung di banyak tempat; lewati modul penyimpanan.
- Tangani semua panggilan jaringan dengan penanganan gagal (lihat bagian 9).
- Jangan menaruh kunci rahasia atau token di kode atau repositori.

## 5. Aturan Konten Keagamaan (kritis)

Kesalahan pada teks keagamaan lebih serius daripada kesalahan tampilan.

- **Jangan mengarang atau mengetik ulang dari ingatan** teks Arab, transliterasi, terjemahan, doa, dzikir, atau kutipan hadis. Ambil dari sumber data yang disepakati (API EQuran.id atau berkas JSON lokal yang sudah diverifikasi).
- **Jangan mengubah teks Arab**: harakat, tanda baca, dan urutan karakter harus utuh. Jangan mengurai, mengurutkan ulang, atau memotong teks Arab di tengah kata.
- Teks Arab ditampilkan dengan `dir="rtl"`, rata kanan, font Amiri, tinggi baris sekitar 2,0, memakai warna teks utama.
- Isi contoh pada desain (ayat, doa, dzikir, kata bermanfaat) **hanya contoh tampilan**. Jangan menyalinnya sebagai data produksi.
- Setiap berkas data keagamaan (`doaharian.json`, dzikir, kartu informasi) wajib mencantumkan sumber dan perlu ditinjau manusia sebelum rilis. Jika sumber tidak jelas, tandai dan tanyakan.
- Jangan membuat klaim hukum atau fatwa. Aplikasi menyajikan teks, bukan memberi putusan.
- Gunakan istilah yang sama dengan sumber data (misalnya nama surah), dan jangan menerjemahkan ulang sendiri.

## 6. Data dan API

- **Jadwal sholat:** Aladhan API (`timingsByCity` dan versi koordinat).
  - Metode perhitungan harus sesuai negara. Kemenag untuk Indonesia. Catatan awal proyek menyebut kode `11`, tetapi itu kemungkinan keliru (kode Kemenag di Aladhan diduga `20`). **Verifikasi di dokumentasi Aladhan sebelum dipakai** dan bandingkan dengan jadwal resmi.
  - Buat pemetaan negara ke metode di satu tempat, bukan tersebar.
- **Al-Qur'an:** EQuran.id API v2 (daftar surah, detail surah, terjemahan, audio, tafsir singkat).
- **Doa, dzikir, kartu informasi:** berkas JSON lokal.
- Semua respons API divalidasi bentuknya sebelum dipakai; jangan mengasumsikan semua kolom ada.
- Cache setiap data setelah pemuatan pertama. Jadwal sholat hari ini harus tetap tampil saat offline dengan penanda "data tersimpan".

## 7. Desain

### 7.1 Warna (token)

| Token | Terang | Gelap |
| --- | --- | --- |
| `--color-bg` | `#F7F5EC` | `#0E1A14` |
| `--color-surface` | `#FFFFFF` | `#15251D` |
| `--color-border` | `#E1E6D8` | `#223529` |
| `--color-primary` | `#1F7A4D` | `#4CC38A` |
| `--color-primary-fg` | `#FFFFFF` | `#0E1A14` |
| `--color-primary-soft` | `#E3F2E8` | `#1B3A2B` |
| `--color-primary-ink` | `#176340` | `#4CC38A` |
| `--color-gold` | `#B8892B` | `#E0B863` |
| `--color-text` | `#16241C` | `#EAF1EC` |
| `--color-text-muted` | `#5A6B60` | `#9DB0A4` |
| `--color-danger` | `#B3402E` | `#E8806F` |

Aturan warna:

- Semua warna lewat token. **Jangan menulis kode warna langsung di komponen.**
- Teks dan ikon di atas hijau lembut memakai `--color-primary-ink`, bukan hijau utama (hijau utama di atas hijau lembut hanya sekitar 4,5:1). Daftar token lengkap ada di `desain.md`.
- Satu tombol utama (hijau penuh) per halaman. Tombol lain bergaya garis atau teks.
- Emas hanya untuk ikon dan penanda kecil (bookmark, favorit), bukan teks kecil.
- Jangan memakai hitam atau putih murni sebagai latar halaman.
- Kontras teks minimal 4,5:1; ikon dan teks besar minimal 3:1. Verifikasi dengan alat kontras.

### 7.2 Tipografi

- Judul halaman: 17 px / 24 px, berat 600, **rata tengah**.
- Judul seksi: 18 / 26, berat 600. Teks isi dan terjemahan: 15 / 26. Label tombol dan menu: 14 / 20, berat 500. Keterangan kecil: 12 / 16.
- Angka waktu sholat memakai angka rata (`tabular-nums`).
- Teks Arab: kecil 26 px, sedang 30 px (bawaan), besar 36 px, tinggi baris 2,0. Tata letak tidak boleh rusak pada ukuran besar.

### 7.3 Bentuk dan jarak

- Satuan dasar 4 px (4, 8, 12, 16, 24, 32). Margin halaman 16 px di HP.
- Sudut: kartu 12 px, tombol dan input 10 px, chip bulat penuh.
- Kartu: latar surface, garis 1 px, **tanpa bayangan**. Bayangan hanya untuk dialog dan bottom sheet.
- Area sentuh minimal 44 x 44 px. Ikon Lucide 20 px (24 px di navigasi), tebal garis 1,75.

### 7.4 Navigasi dan tata letak halaman

- **Bottom bar 5 menu:** Beranda, Qur'an & Doa, Dzikir, Tersimpan, Profil (paling kanan). Menu aktif berupa lingkaran hijau yang menonjol di atas bar, dengan lekukan melengkung di belakangnya. Lingkaran dan lekukan berpindah mengikuti menu aktif.
- Halaman turunan **tanpa bottom bar** memakai panah kembali di pojok kiri atas dan judul di tengah: Daftar Surah, Baca Surah (diganti pemutar audio), Doa Harian, Detail Doa, Pilih Lokasi, Pilih Negara, Jadwal Sholat, Notifikasi.
- Beranda: ikon lonceng (Notifikasi) di kanan atas, nama kota dapat ditekan untuk mengganti lokasi, kartu sholat berikutnya membuka Jadwal Sholat.
- Layar lebar (1024 px ke atas): bottom bar menjadi sidebar kiri 240 px; lebar baca maksimal 720 px.
- Beri ruang aman di bawah konten agar tidak tertutup bottom bar atau pemutar audio.

### 7.5 Gerak

Durasi 150 sampai 200 ms, hanya untuk perubahan warna, fade, dan pergeseran kecil. Tidak ada animasi pada teks Arab atau hitungan mundur. Hormati pengaturan sistem untuk mengurangi gerakan. Kartu informasi di halaman Qur'an & Doa bergeser otomatis setiap 5 sampai 10 detik, bisa digeser manual, dan berhenti otomatis saat gerakan dikurangi.

## 8. Mode Gelap dan Terang

- Tiga pilihan: Terang, Gelap, Ikut sistem (bawaan). Disimpan di perangkat dan diterapkan **sebelum halaman tampil** agar tidak berkedip.
- Setiap komponen baru wajib dicek di kedua mode.
- Gambar dan ilustrasi punya versi untuk kedua mode atau berupa ikon satu warna.

## 9. Keadaan Khusus dan Offline

Setiap layar yang memuat data wajib punya empat keadaan:

- **Memuat:** kerangka abu lembut (skeleton), bukan layar kosong.
- **Kosong:** ikon, satu kalimat, satu aksi (misalnya "Buka Al-Qur'an").
- **Error:** pesan jelas dan tombol "Coba lagi". Jangan tampilkan pesan teknis mentah.
- **Offline:** pita kecil di atas layar dan penanda "Data tersimpan" pada data dari cache.

Status tidak hanya dibedakan lewat warna; tambahkan ikon atau teks.

## 10. Aksesibilitas

- Tombol berupa ikon wajib punya label (`aria-label`), misalnya "Kembali", "Notifikasi", "Bookmark ayat 4".
- Cincin fokus 2 px berwarna utama untuk navigasi keyboard.
- Gunakan elemen yang tepat: tombol untuk aksi, tautan untuk perpindahan halaman. Satu `h1` per halaman.
- Penghitung dzikir dan pemutar audio dapat dipakai tanpa gestur rumit.

## 11. Privasi dan Keamanan

- Lokasi hanya dipakai untuk menghitung jadwal sholat. Jangan dikirim ke pihak ketiga selain API jadwal yang disepakati, dan jangan disimpan di server.
- Tidak ada iklan, pelacakan pihak ketiga, atau analitik tanpa persetujuan pemilik proyek.
- Data bookmark dan pencatatan sholat tersimpan lokal di perangkat. Jangan mengirimnya keluar.
- Saat akun ditambahkan (Fase 2): login bersifat opsional, semua fitur tetap bisa dipakai sebagai tamu, dan bookmark lokal digabung ke akun tanpa duplikat saat login pertama.

## 12. Bahasa dan Gaya Penulisan

- Teks antarmuka berbahasa Indonesia yang sederhana dan sopan. Konsisten dengan istilah yang sudah dipakai: Beranda, Qur'an & Doa, Dzikir, Tersimpan, Profil, Keluar, Masuk, Daftar.
- Penulisan "Al-Qur'an" memakai apostrof lurus yang konsisten; nama surah mengikuti sumber data.
- Pesan singkat, tanpa tanda seru berlebihan, tanpa bahasa yang menggurui.
- Pakai tanda kutip dan apostrof tipografis hanya jika sudah menjadi pola di proyek; jangan campur gaya.

## 13. Daftar Cek Sebelum Menyatakan Selesai

- [ ] Sesuai PRD (FR terkait) dan desain halaman tersebut.
- [ ] Tampil benar di lebar 360 px dan 390 px, serta tidak ada gulir ke samping.
- [ ] Mode terang dan gelap sama-sama rapi; kontras diperiksa.
- [ ] Empat keadaan (memuat, kosong, error, offline) ditangani.
- [ ] Halaman tetap bisa dibuka tanpa internet jika datanya sudah pernah dimuat.
- [ ] Tidak ada warna yang ditulis langsung; semua lewat token.
- [ ] Satu tombol utama per halaman; area sentuh minimal 44 px.
- [ ] Tombol ikon punya label; urutan fokus keyboard masuk akal.
- [ ] Teks keagamaan berasal dari sumber data, bukan diketik ulang.
- [ ] Tidak ada kunci rahasia, `console.log` sisa, atau kode mati.
- [ ] Build dan lint lolos tanpa peringatan baru.

## 14. Format Laporan Setelah Tugas

Tulis singkat, tanpa mengulang isi kode:

1. **Yang dikerjakan:** satu atau dua kalimat.
2. **Berkas yang berubah:** daftar ringkas.
3. **Asumsi:** hal yang kamu putuskan sendiri.
4. **Belum selesai atau perlu keputusan:** satu pertanyaan jika ada.
5. **Cara memeriksa:** langkah singkat untuk melihat hasilnya.

## 15. Yang Tidak Boleh Dilakukan

- Menulis kode sebelum memahami tugas dan membaca rujukan.
- Mengerjakan fitur Fase 2 atau fitur di luar PRD tanpa diminta.
- Mengarang data keagamaan, atau mengubah teks Arab.
- Menimpa berkas yang bukan bagian tugas, atau menghapus data pengguna.
- Menambah dependensi, mengubah struktur proyek, atau mengganti stack tanpa persetujuan.
- Mengubah desain yang sudah disepakati (warna, navigasi, tata letak) tanpa diminta; bila perlu diubah, usulkan dulu.
- Menyatakan "selesai" tanpa menjalankan daftar cek di bagian 13.
- Menyembunyikan masalah. Jika menemukan kesalahan di PRD, desain, atau kode yang ada, sampaikan.