# Rencana Pengingat & Adzan Versi Android (Capacitor)

Dokumen ini merangkum rancangan teknis pengingat waktu sholat saat aplikasi **tertutup** (*background*) pada versi Android (dan catatan batas iOS) menggunakan Capacitor, sebagai lanjutan dari pengingat saat aplikasi terbuka di web. **Tidak ada kode Capacitor yang ditambahkan pada tahap web ini.**

---

## 1. Pendekatan Utama: `@capacitor/local-notifications`

- Seluruh jadwal sholat dihitung dan di-cache secara lokal di perangkat (dari Aladhan API bulanan yang sudah di-cache), sehingga **tidak memerlukan Web Push maupun server yang menyimpan lokasi pengguna**.
- Saat aplikasi aktif atau dijadwalkan ulang, aplikasi mendaftarkan notifikasi lokal terjadwal untuk beberapa hari ke depan (misalnya 7 hari ke depan pada Android, agar total jadwal tetap ringan dan terkelola).

---

## 2. Kanal Notifikasi & Suara Kustom (Android 8+ / API 26+)

- Android 8.0 ke atas mewajibkan **Notification Channel** (`channelId`) agar notifikasi dan suara kustom berjalan.
- `@capacitor/local-notifications` menyediakan `createChannel()`, `deleteChannel()`, dan `listChannels()`.
- Berkas audio adzan diletakkan di direktori native Android `android/app/src/main/res/raw/` (nama huruf kecil tanpa spasi, mis. `adzan.mp3`) dan ditautkan ke channel dengan `NotificationManager.IMPORTANCE_HIGH`.
- **Penting:** Setelah sebuah channel dibuat di Android dengan pengaturan suara tertentu, **suara channel tidak dapat diubah secara terprogram** kecuali pengguna mengubahnya di pengaturan sistem atau aplikasi dipasang ulang (alternatif: buat channel ID baru jika mengganti suara).

---

## 3. Alarm Tepat Waktu (*Exact Alarm*) & Optimasi Baterai Android

- Mulai Android 12 (API 31+), penjadwalan alarm tepat waktu memerlukan deklarasi izin di `AndroidManifest.xml`:
  - `SCHEDULE_EXACT_ALARM`: ditolak secara bawaan pada Android 13+ untuk aplikasi baru sehingga pengguna perlu mengaktifkannya melalui pengaturan sistem; dapat dicek lewat `checkExactNotificationSetting()`.
  - `USE_EXACT_ALARM` (Android 14+): otomatis diberikan saat instalasi, tetapi **dibatasi kebijakan Google Play** khusus untuk aplikasi jam alarm, timer, atau pengingat inti. (Kelayakan penggunaan `USE_EXACT_ALARM` untuk aplikasi jadwal sholat di Play Store perlu diverifikasi saat peninjauan Play Console).
- Agar alarm tetap berbunyi saat perangkat dalam **Doze Mode** (layar mati lama):
  - Gunakan `schedule: { at: ..., allowWhileIdle: true }` pada `@capacitor/local-notifications` (memetakan ke `setExactAndAllowWhileIdle` di Android).
  - Pada perangkat dengan manajemen baterai agresif dari pabrikan (Xiaomi, Oppo, Vivo, Samsung), arahkan pengguna secara opsional untuk mengecualikan aplikasi dari optimasi baterai (`PowerManager.isIgnoringBatteryOptimizations()` / `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, dengan memperhatikan aturan peninjauan Google Play).

---

## 4. Batas Platform iOS (Jika Diperluas ke iOS)

- **Batas 64 notifikasi terjadwal:** iOS membatasi maksimal **64 local notifications** yang tertunda per aplikasi. Untuk 5 waktu sholat per hari, penjadwalan harus dibatasi maksimal **12 hari ke depan** (60 notifikasi) dan dibersihkan secara berkala (`getPending()` / `cancel()`).
- **Batas durasi suara notifikasi iOS:** Pada iOS, suara notifikasi lokal kustom dibatasi **maksimal 30 detik** (berkas lebih dari 30 detik dipotong atau jatuh ke suara bawaan iOS). *(Catatan: batas 30 detik adalah ketentuan standar Apple APNs/UNNotificationSound; perlu diuji langsung pada perangkat iOS nyata saat pembangunan wrapper iOS).*
- iOS tidak memakai `channelId`; gunakan `sound` langsung di payload dan `presentationOptions: ['badge', 'sound', 'banner']` bila ingin tampil saat foreground.

---

## 5. Penjadwalan Ulang Otomatis

Notifikasi lokal terjadwal di Android perlu dijadwalkan ulang pada kejadian berikut:
1. **Saat aplikasi dibuka:** Sinkronkan ulang jadwal 7 hari ke depan dari cache.
2. **Saat lokasi atau preferensi pengingat berubah:** Batalkan jadwal lama (`cancel()`) dan jadwalkan ulang sesuai zona waktu/kota baru.
3. **Setelah perangkat dinyalakan ulang (`BOOT_COMPLETED`):** `AlarmManager` Android menghapus seluruh alarm terjadwal saat perangkat mati/restart. Diperlukan native `BroadcastReceiver` untuk `android.intent.action.BOOT_COMPLETED` (dengan izin `RECEIVE_BOOT_COMPLETED`) atau pengecekan oleh plugin/worker untuk menjadwalkan ulang notifikasi. *(Perlu verifikasi implementasi receiver bawaan versi `@capacitor/local-notifications` yang dipakai saat integrasi).*

---

## 6. Sumber Resmi yang Dirujuk

1. Capacitor Local Notifications Plugin Docs: https://capacitorjs.com/docs/apis/local-notifications
2. Android Exact Alarms (`SCHEDULE_EXACT_ALARM` & `USE_EXACT_ALARM`): https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
3. Android Doze & App Standby: https://developer.android.com/training/monitoring-device-state/doze-standby
4. Android Notification Channels: https://developer.android.com/develop/ui/views/notifications/channels
