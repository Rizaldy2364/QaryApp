# Daftar Uji Perangkat Fisik (QA Checklist for Mobile Devices) - QaryApp

Dokumen panduan checklist pengujian antarmuka, gestur sentuh, dan performa aplikasi pada ponsel fisik (Android & iOS).

---

## Informasi Perangkat Uji Disarankan
- **Android**: Layar 360px - 412px (Chrome Mobile, Android 11+)
- **iOS**: iPhone SE / iPhone 13 / iPhone 15 Pro (Safari Mobile, iOS 16+)

---

## Matriks Checklist Pengujian

### 1. Tata Letak dan Area Sentuh (Touch Target)
- [ ] **Target Sentuh Minimum**: Semua tombol, ikon navigasi, dan tautan memiliki area sentuh minimal $44 \times 44$ piksel.
- [ ] **Bebas Geser Horizontal**: Tidak ada elemen yang meluap (*overflow-x*) pada lebar layar sempit 360px.
- [ ] **Lekukan BottomBar**: Ikon aktif menonjol ke atas 48px dengan latar hijau dan lengkungan transisi halus tanpa flicker.
- [ ] **Safe Area Inset**: Tampilan tidak tertutup poni (*notch*), Dynamic Island, atau bilah navigasi bawah iOS (*home indicator*).

### 2. Beranda (`/`)
- [ ] Lokasi kota dan tanggal Hijriah ditampilkan rapi dengan celah sisi (`px-5`).
- [ ] Timer hitungan mundur sholat berjalan tiap detik tanpa menyebabkan layar bergetar (*re-render lag*).
- [ ] Menekan kartu "Sudah sholat [Nama]?" mencatat sholat hari ini dengan tanda centang dan memperbarui jumlah tercatat (misal "1/5 sholat telah tercatat hari ini").
- [ ] Klik kartu jadwal sholat mengarahkan ke halaman detail Jadwal Sholat (`/jadwal-sholat`).
- [ ] Tiga menu jalan pintas (Al-Qur'an, Doa, Dzikir) mengarahkan ke halaman yang sesuai.
- [ ] Kartu kemajuan Al-Qur'an menampilkan surah terakhir dibaca beserta ayat dan persentase juz.

### 3. Al-Qur'an (`/quran` & `/quran/:surah`)
- [ ] Pencarian surah berfungsi cepat dengan pencarian nama Latin, arti, atau nomor surah.
- [ ] Halaman baca surah menampilkan teks Arab dengan jenis huruf **Amiri** yang jelas dan tanda harakat lengkap.
- [ ] Toggle pengaturan bacaan (terjemahan, transliterasi, ukuran teks Arab Kecil/Sedang/Besar) berfungsi langsung.
- [ ] Audio per-ayat dapat diputar dan dihentikan dengan lancar.
- [ ] Menekan ikon bookmark pada ayat menambahkan ayat ke halaman Tersimpan.
- [ ] Memasukkan nomor surah di luar 1-114 (misal `/quran/999`) menampilkan halaman 404 (Bukan blank screen).

### 4. Doa Harian (`/doa` & `/doa/:id`)
- [ ] Filter kategori (Semua, Harian, Ibadah, Dzikir, dll.) berfungsi instan.
- [ ] Pencarian doa dapat menemukan judul doa dan arti bahasa Indonesia.
- [ ] Menekan ikon hati pada detail doa menambahkan ke daftar favorit.
- [ ] Memasukkan ID doa tidak valid (misal `/doa/xyz`) menampilkan halaman 404.

### 5. Dzikir Pagi & Petang (`/dzikir`)
- [ ] Otomatis memilih tab Dzikir Pagi sebelum Dzuhur dan Dzikir Petang setelah Dzuhur.
- [ ] Menekan tombol lingkaran hitungan menambah counter dzikir.
- [ ] Saat mencapai target pengulangan, counter otomatis berpindah ke butir dzikir berikutnya.
- [ ] Progres bar di bagian atas bertambah sesuai persentase dzikir yang selesai.
- [ ] Tombol reset mengembalikan hitungan dengan konfirmasi aman.

### 6. Tersimpan (`/tersimpan`)
- [ ] Tab Ayat menampilkan seluruh bookmark ayat yang disimpan.
- [ ] Tab Doa menampilkan seluruh doa favorit yang disimpan.
- [ ] Menekan salah satu entri langsung membuka ayat/doa yang bersangkutan.
- [ ] Tombol hapus menghapus entri dari IndexedDB seketika.

### 7. Profil & Pengaturan (`/profil`)
- [ ] Penggantian tema: Terang, Gelap, Ikut Sistem bekerja instan dan tidak berkedip (*no flicker* saat reload).
- [ ] Penggantian ukuran Arab tercermin di contoh teks pratinjau.
- [ ] Pilihan kota lokasi tersambung ke pengaturan.
- [ ] Tautan Sumber Data & Lisensi membuka daftar atribusi lengkap.

### 8. Aksesibilitas & Papan Ketik
- [ ] Tombol **Tab** memunculkan tautan "Lewati ke konten" di bagian paling atas.
- [ ] Fokus berpindah secara logis dari atas ke bawah.
- [ ] Judul halaman (`document.title`) berganti sesuai rute (misal: "Beranda · QaryApp", "Al-Qur'an & Doa · QaryApp").
- [ ] Pembaca layar (TalkBack di Android / VoiceOver di iOS) dapat membacakan nama tombol ikon (`aria-label`).

### 9. Responsivitas Layar Lebar (Tablet / Desktop $\ge 1024$ px)
- [ ] Bilah navigasi bawah tersembunyi (`lg:hidden`).
- [ ] Sidebar navigasi desktop 240px tampil di sebelah kiri dengan status aktif jelas.
- [ ] Lebar konten utama dibatasi secara ergonomis di tengah layar.
