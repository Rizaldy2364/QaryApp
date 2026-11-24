# Evaluasi Sumber Data Doa dan Dzikir (QaryApp)

Dokumen ini mencatat evaluasi kandidat sumber data untuk Doa Harian dan Dzikir Pagi-Petang sesuai ketentuan `agent.md` dan kebutuhan fungsional FR-5.x serta FR-6.x pada `prd.md`.

---

## 1. Kandidat 1: `fitrahive/dua-dhikr` (Sumber Terpilih)

- **Alamat Repositori:** https://github.com/fitrahive/dua-dhikr
- **Lisensi:** MIT License (Copyright (c) 2023 Fitrahive)
- **Syarat Atribusi:** Menyertakan pemberitahuan hak cipta dan lisensi MIT asli pada distribusi perangkat lunak.
- **Bentuk Data:** Berkas JSON terstruktur per bahasa (`data/dua-dhikr/*/id.json`).
- **Cakupan & Jumlah Entri:**
  - Dzikir Pagi (`morning-dhikr/id.json`): 19 entri lengkap dengan teks Arab, transliterasi Latin, arti bahasa Indonesia, anjuran pengulangan (`notes`), faedah, dan nomor hadis riwayat (`source`).
  - Dzikir Petang (`evening-dhikr/id.json`): 19 entri lengkap dengan struktur yang sama.
  - Doa Harian (`daily-dua/id.json`): 38 entri doa sehari-hari (tidur, makan, bepergian, kamar mandi, masjid, dsb.).
  - Doa Pilihan (`selected-dua/id.json`): 8 entri doa perlindungan dan permohonan penting.
- **Kelebihan:**
  - Lisensi resmi MIT yang sangat jelas, bebas, dan sah untuk pemanfaatan pada aplikasi ini.
  - Memiliki dataset Dzikir Pagi dan Dzikir Petang yang terstruktur rapi dengan urutan wirid, faedah, dan pengulangan (1x, 3x, 7x, 100x).
  - Teks Arab utuh dengan harakat lengkap, disertai transliterasi fonetik Indonesia dan terjemahan bahasa Indonesia yang jelas.
  - Setiap entri memiliki rujukan sumber hadis (misalnya HR. Bukhari, Muslim, Abu Dawud, At-Tirmidzi).
- **Kekurangan:**
  - Doa harian pada repositori aslinya belum dipilah ke dalam sub-kategori eksplisit, sehingga skrip import memetakan entri ke dalam 10 kategori tematik (Tidur, Makan & Minum, Rumah & Toilet, Masjid & Ibadah, Perjalanan, Pakaian, Fenomena Alam, Keluarga & Adab, Perlindungan & Hajat, dan Doa Pilihan).
- **Contoh Entri 1 (Dzikir Pagi - Ayat Kursi):**
  ```json
  {
    "title": "Ayat al-Kursi",
    "arabic": "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ ...",
    "latin": "Allāhu lā ilāha illā huwalḥayyul qayyụm...",
    "translation": "Allah, tidak ada Tuhan (yang berhak disembah) melainkan Dia...",
    "notes": "Dibaca 1x",
    "source": "HR. at-Tirmidzi: 2879"
  }
  ```
- **Contoh Entri 2 (Doa Harian - Bangun Tidur):**
  ```json
  {
    "title": "Doa Bangun Tidur",
    "arabic": "الحَمْدُ للهِ الَّذِي أَحْيَانَا بعْدَ مَا أماتَنَا وإِلَيْهِ النُّشُورُ",
    "latin": "Alhamdulillāhillażī aḥyānā ba'da mā amātanā wa ilaihin nusyūr",
    "translation": "Segala puji bagi Allah, yang telah membangunkan kami setelah menidurkan kami...",
    "source": "HR. Bukhari: 6327"
  }
  ```

---

## 2. Kandidat 2: `EQuran.id API` (`https://equran.id/api/doa`)

- **Alamat:** https://equran.id/api/doa
- **Lisensi:** REST API publik terbuka dengan CORS `*`. Tidak memiliki berkas lisensi hak cipta perangkat lunak eksplisit (seperti MIT/Apache/CC).
- **Syarat Atribusi:** Tidak ada ketentuan tertulis eksplisit.
- **Bentuk Data:** REST API mengembalikan JSON (`{ status: "success", total: 227, data: [...] }`).
- **Cakupan & Jumlah Entri:**
  - 227 entri doa harian dalam 44 grup/kategori.
  - Setiap entri memiliki kolom `id`, `grup`, `nama`, `ar`, `tr`, `idn`, dan `tentang` (hadis riwayat).
- **Kelebihan:**
  - Jumlah doa sangat banyak (227 doa) dengan 44 kategori yang sudah terorganisir.
- **Kekurangan:**
  - **TIDAK menyediakan dataset Dzikir Pagi dan Dzikir Petang** dengan urutan (order) dan hitungan pengulangan (repeatCount) yang menjadi syarat mutlak fitur penghitung dzikir di FR-6.x.
  - Ketiadaan lisensi terbuka eksplisit dapat berisiko terhadap kepatuhan hak cipta penggunaan ulang.
- **Contoh Entri 1:**
  ```json
  {
    "id": 1,
    "grup": "Doa Sebelum dan Sesudah Tidur",
    "nama": "Doa Sebelum Tidur 1",
    "ar": "بِاسْمِكَ رَبِّيْ وَضَعْتُ جَنْبِيْ...",
    "tr": "Bismika robbii wa dho'tu janbii...",
    "idn": "Dengan nama Engkau, wahai Tuhanku...",
    "tentang": "HR. Al-Bukhari 11/126, Muslim 4/2084. Sumber: Hisnul Muslim."
  }
  ```
- **Contoh Entri 2:**
  ```json
  {
    "id": 8,
    "grup": "Doa di Kamar Mandi",
    "nama": "Doa Masuk Kamar Mandi",
    "ar": "اللَّهُمَّ إِنِّي أَعُوْذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
    "tr": "Alloohumma innii a'uudzu bika minal khubutsi wal khobaa-its.",
    "idn": "Ya Allah, sesungguhnya aku berlindung kepada-Mu dari godaan setan laki-laki dan perempuan.",
    "tentang": "HR. Al-Bukhari 1/45 dan Muslim 1/283. Sumber: Hisnul Muslim."
  }
  ```

---

## 3. Kesimpulan dan Keputusan Pemilihan Sumber

Sumber yang dipilih adalah **`fitrahive/dua-dhikr`**.

**Alasan Pemilihan:**
1. **Memenuhi Seluruh 4 Kriteria Wajib:**
   - Lisensi resmi MIT yang bebas untuk penggunaan komersial maupun non-komersial.
   - Menyediakan teks Arab dan terjemahan bahasa Indonesia lengkap di setiap entri.
   - Menyertakan sumber/dalil hadis pada setiap doa dan dzikir.
   - Dapat diimpor secara terprogram langsung ke berkas JSON lokal.
2. **Ketersediaan Data Dzikir Pagi dan Petang:**
   - Satu-satunya kandidat yang menyediakan paket lengkap wirid Dzikir Pagi (19 doa) dan Dzikir Petang (19 doa) beserta jumlah pengulangan (`repeatCount`), faedah keutamaan, dan teks Arab yang lengkap.
3. **Kepatuhan Konten Keagamaan:**
   - Semua entri yang diimpor akan diberi status `reviewStatus: "unreviewed"` sampai ditinjau oleh manusia sebelum rilis produksi.
