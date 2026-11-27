# Panduan Deploy QaryApp ke Vercel & Neon PostgreSQL

Dokumen ini menjelaskan konfigurasi deployment aplikasi web QaryApp beserta adapter backend Fastify (`/api/*`) di Vercel dengan basis data Neon PostgreSQL.

---

## 1. Pengaturan Proyek di Vercel

Buka **Project Settings** di dashboard Vercel dan pastikan pengaturan berikut sesuai:

| Pengaturan | Nilai | Keterangan |
| --- | --- | --- |
| **Root Directory** | `qaryapp` | Folder utama aplikasi web, `api/index.ts`, `vercel.json`, dan `server/` |
| **Framework Preset** | `Vite` | Bawaan untuk proyek Vite |
| **Install Command** | `pnpm install && pnpm --dir server install` | Sudah didefinisikan di `vercel.json` agar dependensi web dan `server/` ikut terpasang |
| **Build Command** | `pnpm --dir server build && pnpm build` | Sudah didefinisikan di `vercel.json` dan `package.json` (`pnpm build`) agar `server/dist/` terkompilasi sebelum web |
| **Output Directory** | `dist` | Hasil build statis Vite |

### Variabel Lingkungan (Environment Variables)

Tambahkan variabel berikut di **Settings → Environment Variables** Vercel (untuk **Production** dan **Preview** bila perlu):

| Nama Variabel | Jenis | Contoh / Nilai | Keterangan |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Secret** | `postgresql://<user>:<password>@<host>/<db>?sslmode=require` | Connection string Neon PostgreSQL. Jangan pernah menaruh nilai asli di repositori. |
| `NODE_ENV` | Plaintext | `production` | Mengaktifkan cookie `Secure` dan mode produksi Fastify |
| `TRUST_PROXY` | Plaintext | `true` | Agar `request.protocol` dan IP klien terbaca benar di balik proxy Vercel |
| `SESSION_TTL_DAYS` | Plaintext | `30` | Masa berlaku sesi login (hari) |
| `ALLOWED_ORIGIN` | Plaintext (opsional) | `https://qary-app.vercel.app` | Opsional bila domain frontend dan `/api/*` sama (`same-origin`) |

### Catatan Parameter `DATABASE_URL` Neon pada `pg` (`v8.23.1`)

Berdasarkan pemeriksaan langsung pada `pg@8.23.1` yang terpasang di `server/`:
- `sslmode=require` dikenali dan mengaktifkan SSL (`ssl: {}`). `pg@8.23.1` juga mengeluarkan peringatan bahwa di `pg` v9 nanti `sslmode=require` akan mengikuti semantik libpq standar, sehingga dapat memakai `sslmode=verify-full` bila ingin mempertahankan verifikasi sertifikat penuh di masa depan.
- `channel_binding=require` tidak menyebabkan error pada `pg@8.23.1`, namun diabaikan (`enableChannelBinding: false`). Bila ingin string koneksi lebih ringkas, cukup cantumkan `sslmode=require` (atau `sslmode=verify-full`).

---

## 2. Menjalankan Migrasi ke Database Neon

Migrasi skema (`users`, `sessions`, `bookmarks`, `doa_favorites`, `last_read`) dikelola oleh `Kysely Migrator` di `qaryapp/server`.

1. Pastikan Anda **memeriksa target `DATABASE_URL`** terlebih dahulu sebelum menjalankan migrasi agar tidak salah menimpa database lokal/pengembangan atau produksi.
2. Pastikan dependensi `server/` sudah terpasang (`pnpm --dir qaryapp/server install`).
3. Jalankan perintah migrasi dari folder `qaryapp/server`:

```bash
cd qaryapp/server
# Pastikan DATABASE_URL di .env atau shell mengarah ke database Neon yang benar
pnpm migrate
```

Untuk memeriksa atau mengembalikan satu langkah migrasi bila diperlukan:

```bash
pnpm migrate:down
```

> **Peringatan:** Jangan menyimpan atau melakukan commit berkas `.env` berisi `DATABASE_URL` ke Git (sudah diblokir oleh `.gitignore`).

---

## 3. Cara Membaca Log di Vercel

1. Buka dashboard proyek Vercel → **Deployments** → pilih deployment terbaru.
2. Buka tab **Build Logs** untuk memastikan baris kompilasi server (`tsc -p tsconfig.json`) dan build web (`tsc -b && vite build`) berjalan tanpa error.
3. Buka tab **Logs** / **Runtime Logs** saat menguji endpoint `/api/*`.
4. Filter berdasarkan `/api` atau status `500`, lalu klik satu baris log merah untuk membuka pesan error lengkap (termasuk jalur berkas seperti `imported from /var/task/...`).

---

## 4. Daftar Pemeriksaan Setelah Deploy

Jalankan pemeriksaan berurutan berikut setelah deployment berstatus **Ready**:

- [ ] `GET https://<domain-vercel>/api/health` mengembalikan status **`200`** dengan body `{"status":"ok"}`.
- [ ] `GET https://<domain-vercel>/api/auth/me` saat belum masuk mengembalikan status **`401`** (`{"error":{"code":"UNAUTHORIZED",...}}`), **bukan `500`**.
- [ ] Halaman web non-API (misalnya `/`, `/daftar`, `/jadwal-sholat`) dapat dibuka dan di-refresh langsung tanpa `404`.
- [ ] Alur **Daftar** (`/daftar`) berhasil membuat akun (`201`) dan mengarahkan ke `/masuk`.
- [ ] Alur **Masuk** (`/masuk`) berhasil (`200`) dan `GET /api/auth/me` mengembalikan data pengguna (`200`).
- [ ] Alur **Keluar** dan **Hapus Akun** di `/profil` berhasil (`200`) tanpa galat CSRF/Origin.
