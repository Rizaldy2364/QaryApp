# Berkas Audio Adzan & Ketentuan Lisensi

Aplikasi web QaryApp **tidak menyertakan** rekaman adzan bawaan di repositori. Modul pengingat membaca konstanta tunggal `ADZAN_AUDIO_PATH = '/audio/adzan.mp3'` pada [src/features/notifications/adzan.ts](../src/features/notifications/adzan.ts) dan memeriksa ketersediaannya secara aman sebelum menawarkan mode **Notifikasi + Adzan**.

---

## 1. Cara Menambahkan Berkas Adzan

1. Siapkan berkas audio format MP3 yang valid dan terkompresi ringan (disarankan 64–128 kbps mono/stereo agar cepat dimuat).
2. Letakkan berkas pada:
   ```text
   public/audio/adzan.mp3
   ```
3. Jalankan `pnpm build` — aplikasi akan otomatis mendeteksi `/audio/adzan.mp3` melalui pemeriksaan `HEAD` (memastikan respons bukan fallback HTML SPA).
4. Selama `/audio/adzan.mp3` belum ada, opsi **Notifikasi + Adzan** tetap nonaktif dan pengingat jatuh ke mode **Notifikasi saja** tanpa menimbulkan galat.

---

## 2. Syarat Lisensi

- Rekaman adzan yang ditambahkan **wajib memiliki lisensi yang mengizinkan pemakaian ulang dan distribusi** (misalnya Creative Commons CC0 / CC-BY dengan atribusi di halaman Sumber Data, atau rekaman milik sendiri).
- Jangan mengambil rekaman dari situs/aplikasi lain tanpa izin tertulis atau kejelasan lisensi.

---

## 3. Catatan Khusus Adzan Subuh

- Adzan Subuh memiliki tambahan lafaz *tatswib* (*"Ash-shalatu khairum minan-naum"*).
- Idealnya, versi mendatang menyediakan berkas terpisah (misalnya `/audio/adzan-subuh.mp3`) khusus untuk waktu Subuh. Pada tahap saat ini berkas terpisah belum dibuat dan aplikasi memakai satu konstanta `/audio/adzan.mp3` bila tersedia.

---

## 4. Keputusan Pemilik Proyek yang Diperlukan

1. Memilih atau merekam audio adzan berlisensi jelas untuk ditempatkan di `public/audio/adzan.mp3`.
2. Menentukan apakah adzan Subuh perlu rekaman terpisah sejak rilis web atau baru ditambahkan pada versi Android (Capacitor).
3. Menentukan apakah berkas adzan perlu dicantumkan atribusinya di halaman **Sumber data dan lisensi** (`/profil/sumber-data`).
