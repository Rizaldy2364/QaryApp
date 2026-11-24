# desain.md — Panduan Desain QaryApp

Versi 1.1 · 21 November 2026. Dokumen ini menetapkan warna, tipografi, jarak, ikon, komponen, navigasi, dan keadaan khusus QaryApp, serta daftar halaman yang sudah didesain. Acuannya adalah desain di kanvas (artboard per halaman) dan `prd.md`. Jika dokumen ini berbeda dengan desain di kanvas, tanyakan mana yang benar sebelum melanjutkan.

Catatan: semua isi pada desain (nama pengguna, jam sholat, ayat, doa, dzikir, notifikasi, kata bermanfaat) hanyalah **contoh tampilan**, bukan data produksi.

---

## 1. Prinsip Desain

- Tenang dan bersih: banyak ruang kosong, satu warna utama, tanpa elemen yang mengganggu.
- Teks Arab adalah pusat: ukuran, jarak, dan kontrasnya diutamakan di atas dekorasi.
- Datar: kartu dengan garis tipis tanpa bayangan; bayangan hanya untuk dialog dan bottom sheet.
- Mode gelap sama penting dengan mode terang, bukan versi tambahan.
- Mobile-first: dirancang untuk layar 360 sampai 390 px lebih dulu, lalu diperluas ke layar lebar.

## 2. Warna

Palet berpusat pada hijau ketupat (warna janur), krem hangat sebagai latar, dan emas sebagai aksen kecil.

| Token | Terang | Gelap | Dipakai untuk |
| --- | --- | --- | --- |
| `--color-bg` | `#F7F5EC` | `#0E1A14` | Latar halaman |
| `--color-surface` | `#FFFFFF` | `#15251D` | Kartu, daftar, panel, bottom bar |
| `--color-border` | `#E1E6D8` | `#223529` | Garis kartu dan pemisah |
| `--color-primary` | `#1F7A4D` | `#4CC38A` | Tombol utama, ikon dan tab aktif, angka waktu sholat |
| `--color-primary-fg` | `#FFFFFF` | `#0E1A14` | Teks di atas warna utama |
| `--color-primary-soft` | `#E3F2E8` | `#1B3A2B` | Sorotan sholat berikutnya, tab/chip terpilih, ayat yang diputar |
| `--color-primary-ink` | `#176340` | `#4CC38A` | Teks dan ikon di atas hijau lembut |
| `--color-gold` | `#B8892B` | `#E0B863` | Bookmark, favorit, penanda kecil |
| `--color-text` | `#16241C` | `#EAF1EC` | Teks Arab, judul, isi |
| `--color-text-muted` | `#5A6B60` | `#9DB0A4` | Keterangan, terjemahan pendukung, label |
| `--color-danger` | `#B3402E` | `#E8806F` | Error, aksi keluar, penanda belum dibaca |
| `--color-danger-soft` | `#FBEBEB` | belum ditetapkan | Latar ikon error |
| `--color-skeleton` | `#E9EDE3` | belum ditetapkan | Kerangka saat memuat |

Warna tetap untuk kartu informasi dan ikon aplikasi (tidak berubah antar mode): hijau gelap `#0B2E20`, hijau utama `#1F7A4D`, emas `#E0B863`, krem `#F7F5EC`.

### Aturan pemakaian warna

- Semua warna lewat token. Jangan menulis kode warna langsung di komponen.
- Satu tombol utama (hijau penuh) per halaman; tombol lain bergaya garis atau teks.
- Hijau lembut menandai keadaan aktif atau berikutnya, bukan dekorasi.
- Teks dan ikon di atas hijau lembut memakai `--color-primary-ink`, bukan hijau utama.
- Emas hanya untuk ikon dan penanda kecil. Jangan dipakai untuk teks kecil karena kontrasnya sekitar 3:1 di atas putih.
- Teks Arab selalu memakai warna teks utama.
- Jangan memakai hitam murni atau putih murni sebagai latar halaman.

### Kontras (hitungan awal, verifikasi dengan alat kontras)

- Teks utama di atas latar halaman: lebih dari 12:1 di kedua mode.
- Teks sekunder di atas latar terang: sekitar 5:1.
- Putih di atas tombol hijau terang: sekitar 5,3:1.
- Hijau utama di atas hijau lembut (terang): sekitar 4,5:1, tepat di batas; karena itu dipakai `--color-primary-ink` (sekitar 6:1).
- Teks gelap di atas tombol hijau mode gelap: sekitar 8:1.
- Hijau utama gelap di atas hijau lembut gelap: sekitar 5,6:1.
- Warna danger terang di atas putih: sekitar 5,7:1.

## 3. Tipografi

Dua keluarga font: **Amiri** untuk teks Arab dan **Plus Jakarta Sans** untuk antarmuka. Keduanya dari Google Fonts; sediakan font cadangan (serif untuk Arab, sans-serif untuk UI).

### Teks antarmuka

| Peran | Ukuran / tinggi baris | Berat |
| --- | --- | --- |
| Judul halaman (bilah atas, rata tengah) | 17 / 24 px | 600 |
| Judul besar di Beranda (salam) | 22 / 30 px | 600 |
| Judul seksi | 18 / 26 px | 600 |
| Teks isi dan terjemahan | 15 / 26 px | 400 |
| Label tombol dan menu | 14 / 20 px | 500 |
| Keterangan kecil | 12 / 16 px | 400 |
| Label menu bawah | 11 / 14 px | 400 (aktif 500) |
| Angka waktu sholat | 20 sampai 28 px | 500, angka rata (tabular) |

### Teks Arab (Amiri)

| Pilihan pengguna | Ukuran | Tinggi baris |
| --- | --- | --- |
| Kecil | 26 px | 2,0 |
| Sedang (bawaan) | 30 px | 2,0 |
| Besar | 36 px | 2,0 |

Teks Arab memakai `dir="rtl"` dan rata kanan; terjemahan tetap rata kiri. Tata letak tidak boleh rusak pada ukuran Besar. Di daftar dan kartu ringkas, teks Arab boleh dipotong satu baris dengan elipsis (ukuran 22 sampai 24 px).

## 4. Jarak, Sudut, dan Elevasi

- Satuan dasar 4 px. Skala: 4, 8, 12, 16, 24, 32.
- Margin halaman 16 px di HP, 24 px di tablet. Padding kartu 16 px; jarak antar kartu 12 px.
- Lebar baca maksimal 720 px.
- Sudut: kartu 12 px, tombol dan input 10 px, kartu informasi 16 px, chip dan badge bulat penuh.
- Border 1 px memakai `--color-border`.
- Tidak ada bayangan pada kartu. Dialog dan bottom sheet memakai satu bayangan lembut dan lapisan gelap tipis di belakangnya.

## 5. Ikon

- Antarmuka: Lucide React, ukuran 20 px (24 px di navigasi), tebal garis 1,75, ujung dan sambungan bulat.
- Warna mengikuti teks: aktif `--color-primary`, tidak aktif `--color-text-muted`.
- Ikon tanpa label wajib punya teks alternatif.
- Ikon yang dipakai: beranda, buku terbuka, hati, lingkaran-titik (dzikir), bookmark, pengguna, lonceng, pin lokasi, sasaran lokasi, globe, cari, panah kiri, panah kanan, panah bawah, centang, atur ulang, putar, jeda, sebelumnya, berikutnya, matahari, bulan, matahari terbit, matahari terbenam, bagikan, keluar, awan, wifi mati, peringatan.
- **Ikon aplikasi:** buku terbuka berwarna krem dengan bulan sabit dan bintang emas di atasnya, di atas latar hijau ketupat bergradasi (`#1F7A4D` ke `#0B2E20`) dengan motif belah ketupat tipis berwarna emas. Berkas: `qaryapp-icon.svg` (sudut membulat, untuk web), `qaryapp-icon-maskable.svg` (tanpa sudut membulat, untuk Android maskable), serta PNG 512, 192, 180 (apple-touch), dan 32 (favicon). Area aman: seluruh unsur utama berada di dalam lingkaran 66% dari tengah.

## 6. Komponen Dasar

| Komponen | Spesifikasi | Keadaan |
| --- | --- | --- |
| Tombol utama | Isi primary, teks `primary-fg`, tinggi 44 px (48 px bila lebar penuh), sudut 10 px | Normal, ditekan (sedikit lebih gelap), nonaktif, memuat |
| Tombol garis | Garis 1 px primary, isi transparan, teks `primary-ink` | Normal, ditekan |
| Tombol bahaya | Garis 1 px danger, teks danger (contoh: Keluar) | Normal, ditekan |
| Tombol ikon | 44 x 44 px, ikon 20 px; di bilah atas tanpa garis, di Beranda berlatar surface dengan garis | Normal, ditekan |
| Kartu | Isi surface, garis 1 px, sudut 12 px, padding 16 px | Normal, ditekan (isi hijau lembut tipis) |
| Baris daftar | Tinggi 56 sampai 64 px, pemisah garis tipis, panah kanan | Normal, ditekan, terpilih (hijau lembut + centang) |
| Kolom cari | Tinggi 44 px, ikon cari di kiri, sudut 10 px | Kosong, fokus (cincin primary), terisi |
| Chip kategori | Bulat penuh, tinggi 32 px, teks 13 px | Normal, terpilih (hijau lembut + `primary-ink`) |
| Tab (di dalam halaman) | Tinggi 44 px, garis bawah 2 px primary pada tab aktif | Normal, aktif |
| Kontrol segmen | Tinggi 36 sampai 40 px, garis 1 px, sudut 10 px | Terpilih (hijau lembut + `primary-ink`) |
| Saklar | 44 x 26 px, bulatan 20 px | Aktif (primary), nonaktif |
| Penanda belum dibaca | Titik 8 px; di lonceng berwarna danger dengan garis putih 1,5 px | Ada, tidak ada |
| Baris waktu sholat | Nama kiri, jam kanan, tinggi 40 px | Biasa; berikutnya memakai hijau lembut + chip "Berikutnya" |
| Kartu sholat berikutnya | Nama, jam (primary), hitungan mundur, bilah progres 6 px | Normal, memuat, offline (chip "Data tersimpan") |
| Blok ayat | Nomor, teks Arab, terjemahan, aksi putar dan bookmark | Normal, sedang diputar (hijau lembut), ter-bookmark (ikon emas) |
| Pemutar audio | Bilah tetap di bawah (84 px) dengan progres 3 px, tombol sebelumnya/jeda/berikutnya | Memuat, memutar, jeda, error |
| Penghitung dzikir | Tombol bulat 96 px (primary) berisi hitungan; tombol atur ulang dan berikutnya 48 px bergaris | Normal, ditekan, selesai |
| Kartu informasi | Lihat 6.3 | Aktif, menunggu |

### 6.1 Bilah atas (halaman turunan)

- Tinggi 44 px dengan padding atas 24 px dan bawah 8 px. Tiga kolom: panah kembali (44 x 44) di kiri, judul di tengah, ruang 44 px atau aksi (misalnya ikon favorit) di kanan.
- Judul 17/24 px, berat 600, rata tengah. Subjudul opsional 12/16 px, warna `text-muted`.
- Halaman bertab (dengan bottom bar) memakai bilah atas yang sama, tetapi kolom kirinya kosong (tanpa panah kembali).

### 6.2 Bottom bar

- Lima menu berurutan: **Beranda, Qur'an & Doa, Dzikir, Tersimpan, Profil** (Profil paling kanan). Tiap menu mengambil seperlima lebar.
- Tinggi bar 64 px, latar surface, garis atas 1 px. Label 11/14 px di bawah ikon 24 px.
- Menu aktif: ikon dalam **lingkaran primary 48 px** yang menonjol ke atas, titik tengahnya berada di garis atas bar. Di belakangnya bar memiliki lekukan melengkung (setengah lebar sekitar 38 px, kedalaman sekitar 29 px) yang memperlihatkan latar halaman. Label menu aktif memakai primary dan berat 500, sejajar dengan label menu lain.
- Lingkaran dan lekukan berpindah mengikuti menu aktif. Lekukan digambar sebagai jalur SVG atau ditempatkan dengan CSS mask pada posisi menu aktif.
- Beri ruang aman di bawah konten sebesar tinggi bar ditambah area penonjolan.
- Di layar 1024 px ke atas, bottom bar menjadi sidebar kiri 240 px dan menu aktif memakai sorotan hijau lembut.

### 6.3 Kartu informasi (halaman Qur'an & Doa)

- Berupa carousel horizontal di bagian atas. Lebar kartu = lebar kontainer dikurangi 24 px, tinggi 208 px, sudut 16 px, jarak antar kartu 12 px; kartu berikutnya mengintip sekitar 12 px di sisi kanan.
- Tiga jenis kartu: **Ayat pilihan** (Arab + terjemahan + sumber), **Doa pilihan** (Arab + terjemahan + sumber), **Kata bermanfaat** (teks besar 18/28 px, berat 600).
- Setiap kartu punya gambar latar ilustrasi vektor (SVG) bergradasi hijau dengan unsur emas: langit malam dengan bulan sabit, siluet masjid saat senja, dan pola belah ketupat geometris. Gambar harus berupa aset tersendiri yang di-cache, bukan gambar dari alamat luar.
- Teks selalu putih di atas bagian gambar yang gelap (kontras minimal 4,5:1). Label jenis kartu berupa chip kiri atas berlatar `rgba(11,46,32,.6)`, teks putih 11 px.
- Bergeser otomatis setiap 5 sampai 10 detik (disarankan 7 detik), dapat digeser manual, berhenti sementara saat disentuh atau difokuskan, dan berhenti total bila pengguna mengurangi gerakan.
- Indikator titik di bawah carousel: titik aktif 18 x 6 px (primary), lainnya 6 x 6 px (`#C9D0C3`).

## 7. Navigasi dan Tata Letak Halaman

- Halaman bertab (dengan bottom bar): Beranda, Qur'an & Doa, Dzikir, Tersimpan, Profil.
- Halaman turunan **tanpa bottom bar**, dengan panah kembali di kiri atas dan judul di tengah: Daftar Surah, Baca Surah (bottom bar diganti pemutar audio), Doa Harian, Detail Doa, Pilih Lokasi, Pilih Negara, Jadwal Sholat, Notifikasi.
- Judul halaman selalu rata tengah.
- Beranda: ikon lonceng di kanan atas; nama kota (dengan panah bawah kecil) dapat ditekan untuk membuka Pilih Lokasi; kartu sholat berikutnya (dengan panah kanan kecil) membuka Jadwal Sholat.
- Layar lebar: konten tengah maksimal 720 px untuk baca dan 960 px untuk Beranda.
- Semua area sentuh minimal 44 x 44 px.

## 8. Daftar Halaman yang Sudah Didesain

| Halaman | Bottom bar | Catatan |
| --- | --- | --- |
| Beranda | Ya (Beranda aktif) | Salam, tanggal Masehi dan Hijriah, nama kota, lonceng, kartu sholat berikutnya, daftar jadwal, Lanjutkan membaca, pintasan Doa dan Dzikir |
| Beranda - memuat | Ya | Kerangka abu pada kartu dan daftar jadwal |
| Beranda - offline | Ya | Pita gelap di atas dan chip "Data tersimpan" |
| Beranda - gagal dimuat | Ya | Kartu error dengan tombol Coba lagi |
| Qur'an & Doa | Ya (menu aktif) | Carousel kartu informasi, dua pintu masuk ke Al-Qur'an dan Doa Harian |
| Kartu informasi (contoh isi) | - | Tiga jenis kartu ditampilkan berurutan |
| Daftar Surah | Tidak | Kolom cari dan daftar surah |
| Baca Surah | Tidak | Blok ayat, tombol Aa, pemutar audio tetap di bawah |
| Doa Harian | Tidak | Kolom cari, chip kategori, daftar doa |
| Detail Doa | Tidak | Judul di bilah atas, ikon favorit di kanan, kartu Arab, transliterasi, arti |
| Dzikir | Ya (Dzikir aktif) | Tab Pagi/Petang, progres, kartu, penghitung |
| Tersimpan | Ya (Tersimpan aktif) | Tab Ayat dan Doa, kartu bookmark, ajakan login |
| Tersimpan - kosong | Ya | Ikon, penjelasan, tombol Buka Al-Qur'an |
| Pilih Lokasi | Tidak | Lokasi saat ini, Gunakan lokasi saya, baris Negara, cari kota, daftar kota |
| Pilih Negara | Tidak | Kolom cari dan daftar negara |
| Jadwal Sholat | Tidak | Lima waktu dengan tanda sudah dilaksanakan, ringkasan, pengingat |
| Notifikasi | Tidak | Daftar Hari ini dan Kemarin, Tandai semua dibaca, Atur pengingat |
| Profil (belum masuk) | Ya (Profil aktif) | Kartu akun dengan Masuk dan Daftar, Pengaturan |
| Profil (sudah masuk) | Ya (Profil aktif) | Kartu akun, Pengaturan, Bagikan aplikasi, Keluar |
| Ikon QaryApp | - | Ikon besar, ukuran kecil, potongan bulat |

## 9. Keadaan Khusus

Setiap layar yang memuat data memiliki empat keadaan:

- **Memuat:** kerangka `--color-skeleton` dengan sudut 6 px pada tempat konten, dengan tinggi yang sama seperti konten asli agar tata letak tidak melompat. Beri `role="status"` dan label teks.
- **Kosong:** ikon dalam lingkaran 72 px berlatar hijau lembut, satu judul (17/24 px, berat 600), satu kalimat penjelasan (14/22 px, `text-muted`), dan satu tombol utama bila ada aksi yang jelas.
- **Error:** ikon peringatan dalam lingkaran 56 px berlatar `--color-danger-soft`, judul jelas (misalnya "Jadwal sholat gagal dimuat"), penjelasan singkat tanpa istilah teknis, dan tombol utama "Coba lagi". Tombol utama lain di halaman diturunkan menjadi tombol garis agar hanya ada satu tombol utama.
- **Offline:** pita tipis setinggi 28 px di paling atas layar (latar `--color-text`, teks putih 12 px, ikon wifi mati) berisi "Offline" dan waktu data terakhir diperbarui; data dari cache diberi chip "Data tersimpan" pada kartu terkait.

Status tidak hanya dibedakan lewat warna; selalu tambahkan ikon atau teks.

## 10. Mode Gelap dan Terang

- Tiga pilihan: Terang, Gelap, Ikut sistem (bawaan). Disimpan di perangkat dan diterapkan sebelum halaman tampil agar tidak berkedip.
- Semua warna dari token; token gelap tercantum di bagian 2. Dua token yang belum ditetapkan nilai gelapnya (`danger-soft`, `skeleton`) harus diturunkan dari hijau gelap dan diperiksa kontrasnya.
- Mode gelap memakai hijau kehitaman, bukan hitam murni; hijau utama dicerahkan agar kontras tetap nyaman.
- Kartu informasi dan ikon aplikasi memakai warna tetap yang sama di kedua mode.
- Belum ada artboard mode gelap; saat dibuat, ikuti token di atas.

## 11. Gerak

- Durasi 150 sampai 200 ms, hanya untuk perubahan warna, fade, dan pergeseran kecil.
- Tidak ada animasi pada teks Arab atau hitungan mundur.
- Perpindahan lingkaran bottom bar boleh digeser halus dalam 200 ms.
- Hormati pengaturan sistem untuk mengurangi gerakan: semua animasi dimatikan, termasuk pergeseran otomatis kartu informasi.

## 12. Aksesibilitas Visual

- Kontras teks minimal 4,5:1; teks besar dan ikon minimal 3:1.
- Status tidak hanya dibedakan lewat warna.
- Cincin fokus 2 px berwarna primary untuk navigasi keyboard.
- Tombol ikon wajib punya `aria-label` (Kembali, Notifikasi, Profil, Bookmark ayat 4, Jeda, dan seterusnya).
- Ukuran teks Arab dapat diubah pengguna dan tata letak tetap utuh pada ukuran Besar.
- Pemutar audio dan penghitung dzikir dapat dioperasikan tanpa gestur rumit.

## 13. Belum Didesain

Item berikut ada di `prd.md` tetapi belum divisualkan:

- Pengaturan baca: tombol terjemahan, transliterasi, dan tafsir singkat per ayat (FR-3.1, 3.2, 3.5).
- Tab Doa di halaman Tersimpan.
- Keadaan khusus untuk halaman selain Beranda (misalnya error pemutar audio, daftar surah gagal dimuat).
- Mode gelap untuk semua halaman.
- Tampilan layar lebar (sidebar).
- Penanda "data tersimpan" pada halaman selain Beranda.