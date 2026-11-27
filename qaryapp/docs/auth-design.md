# Rancangan Backend Akun & Sinkronisasi QaryApp (Fase 2)

Dokumen ini menjelaskan arsitektur, skema basis data, daftar endpoint, kebijakan keamanan, strategi cookie, dan privasi data untuk backend akun dan sinkronisasi QaryApp.

---

## 1. Arsitektur Ringkas

Backend QaryApp berdiri sebagai layanan terpisah di direktori `server/` dengan dependensi mandiri menggunakan:

- **HTTP Framework:** Fastify v5 (validasi request/response memakai JSON Schema bawaan).
- **Basis Data & Query Builder:** PostgreSQL dengan Kysely dan `Kysely Migrator`.
- **Keamanan:** `node:crypto` (`scrypt` + `timingSafeEqual` + `randomBytes` + `createHash`), `@fastify/cookie`, `@fastify/helmet`, `@fastify/rate-limit`.
- **Pengujian:** Vitest (unit test murni dan integration test via `app.inject`).

Aplikasi web tetap bersifat *local-first*: seluruh fitur MVP dapat digunakan tanpa login. Akun hanya bersifat opsional untuk mencadangkan dan menyinkronkan bookmark ayat, doa favorit, serta posisi bacaan terakhir antar perangkat.

---

## 2. Strategi Cookie & Proxy (First-Party)

Untuk menjaga keamanan sesi tanpa kerumitan CORS lintas domain di produksi:

1. **Same-Origin lewat Proxy `/api`:**
   - Browser selalu berkomunikasi dengan origin yang sama dengan aplikasi web melalui awalan jalur `/api/...`.
   - **Saat pengembangan:** Proxy dev server Vite meneruskan `/api/*` ke server Fastify lokal (mis. `http://localhost:3000`). `ALLOWED_ORIGIN` dapat dikonfigurasi untuk pengembangan bila diperlukan.
   - **Saat produksi:** Permintaan `/api/*` diteruskan melalui *rewrite* (mis. Vercel/Netlify) atau *reverse proxy* (Nginx/Caddy) ke server Fastify.
2. **Cookie Sesi `qary_session`:**
   - Bersifat *first-party* karena dikirim dari domain yang sama.
   - Bendera wajib: `HttpOnly`, `SameSite=Lax`, `Path=/`, dan `Secure` (aktif di produksi / `NODE_ENV=production`).
   - Masa berlaku mengikuti `SESSION_TTL_DAYS` (bawaan 30 hari) dengan mekanisme *sliding expiration* (diperpanjang bila `last_used_at` lebih lama dari 24 jam).

---

## 3. Skema Basis Data (PostgreSQL)

Seluruh perubahan skema dikelola menggunakan `Kysely Migrator` (mendukung migrasi naik dan turun).

### 3.1 `users`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | `uuid` (PK) | Dihasilkan dengan `gen_random_uuid()` / UUID v4 |
| `email` | `text` (UNIQUE, NOT NULL) | Disimpan dalam huruf kecil (*lowercased & trimmed*) |
| `display_name` | `text` (NULL) | Nama tampilan opsional |
| `password_hash` | `text` (NOT NULL) | Format `scrypt$N$r$p$<salt>$<hash>` |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu pembaruan |

### 3.2 `sessions`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | `uuid` (PK) | Identitas unik sesi |
| `user_id` | `uuid` (FK -> `users.id`, `ON DELETE CASCADE`) | Pemilik sesi |
| `token_hash` | `text` (UNIQUE, NOT NULL) | Hash SHA-256 dari token acak 32 byte |
| `created_at` | `timestamptz` | Waktu sesi dibuat |
| `last_used_at` | `timestamptz` | Waktu terakhir dipakai (untuk *sliding TTL*) |
| `expires_at` | `timestamptz` | Waktu kedaluwarsa sesi |

### 3.3 `bookmarks`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `user_id` | `uuid` (FK -> `users.id`, `ON DELETE CASCADE`) | Bagian dari PK komposit |
| `surah` | `integer` (1..114) | Bagian dari PK komposit |
| `ayah` | `integer` (1..286) | Bagian dari PK komposit |
| `created_at` | `timestamptz` | Waktu dibuat pertama kali |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir (*LWW timestamp*) |
| `deleted_at` | `timestamptz` (NULL) | Penanda hapus (*soft delete*) |

- **Primary Key:** `(user_id, surah, ayah)`
- **Index:** `(user_id, updated_at)` untuk penarikan inkremental (`pull`).

### 3.4 `doa_favorites`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `user_id` | `uuid` (FK -> `users.id`, `ON DELETE CASCADE`) | Bagian dari PK komposit |
| `doa_id` | `text` | Bagian dari PK komposit |
| `created_at` | `timestamptz` | Waktu dibuat pertama kali |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir (*LWW timestamp*) |
| `deleted_at` | `timestamptz` (NULL) | Penanda hapus (*soft delete*) |

- **Primary Key:** `(user_id, doa_id)`
- **Index:** `(user_id, updated_at)` untuk penarikan inkremental (`pull`).

### 3.5 `last_read`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `user_id` | `uuid` (PK, FK -> `users.id`, `ON DELETE CASCADE`) | Satu baris per pengguna |
| `surah` | `integer` (1..114) | Surah terakhir dibaca |
| `ayah` | `integer` (1..286) | Ayat terakhir dibaca |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir (*LWW timestamp*) |

---

## 4. Data yang Disimpan vs Tidak Disimpan (Privasi)

- **Disimpan di server:** `email`, `display_name` (opsional), `password_hash`, `sessions` (hanya `token_hash`), `bookmarks`, `doa_favorites`, `last_read`.
- **TIDAK disimpan di server:** lokasi pengguna, nama kota/negara, koordinat GPS, riwayat catatan sholat harian, penghitung dzikir, pengaturan tampilan/tema, ataupun analitik kebiasaan pengguna.

---

## 5. Daftar Endpoint (`/api`)

Seluruh respons galat menggunakan format konsisten `{ "error": { "code": "...", "message": "..." } }` dengan pesan berbahasa Indonesia.

| Metode & Jalur | Autentikasi | Ringkasan |
| --- | --- | --- |
| `GET /api/health` | Publik | Pemeriksaan kesehatan server & koneksi basis data |
| `POST /api/auth/register` | Publik + CSRF | Mendaftar akun baru (`201`), memasang cookie `qary_session`; `409` jika email sudah ada |
| `POST /api/auth/login` | Publik + CSRF | Masuk akun; selalu `401` ("Email atau kata sandi salah") bila gagal + hash tiruan untuk mencegah timing leak |
| `POST /api/auth/logout` | Publik/Sesi + CSRF | Menghapus sesi di DB dan membersihkan cookie `qary_session` |
| `GET /api/auth/me` | Wajib login | Mengembalikan `{ id, email, displayName, createdAt }` atau `401` |
| `DELETE /api/account` | Wajib login + CSRF | Verifikasi `password`, menghapus pengguna beserta seluruh data berantai, dan membersihkan cookie |
| `GET /api/sync/pull?since=<ISO>` | Wajib login | Menarik perubahan `bookmarks`, `favorites`, dan `lastRead` sejak `since` + `serverTime` |
| `POST /api/sync/push` | Wajib login + CSRF | Upsert idempoten *last-write-wins* (maks 500 item per permintaan, batas skew `updatedAt <= serverTime + 5 menit`) |

---

## 6. Kebijakan Keamanan

1. **Hashing Kata Sandi (`node:crypto` scrypt):**
   - Kata sandi 8–128 karakter.
   - Garam acak 16 byte per pengguna.
   - Parameter: `N = 32768` ($2^{15}$), `r = 8`, `p = 1`, `keylen = 64` (memori ~32 MiB per operasi, `maxmem = 64 MiB`).
   - Format tersimpan: `scrypt$32768$8$1$<saltBase64url>$<hashBase64url>`.
   - Perbandingan memakai `crypto.timingSafeEqual`.
   - Saat login dengan email yang tidak terdaftar, server tetap menjalankan `scrypt` terhadap hash tiruan agar waktu respons seragam.
2. **Token Sesi:**
   - 32 byte acak (`crypto.randomBytes(32).toString('base64url')`).
   - Hanya hash SHA-256 yang disimpan di tabel `sessions`.
3. **Proteksi CSRF:**
   - Semua permintaan selain `GET` dan `HEAD` wajib menyertakan header `X-QaryApp: 1`.
   - Jika header `Origin` ada, nilainya harus cocok dengan origin yang diizinkan (atau host yang sama); selain itu ditolak `403`.
4. **Rate Limiting (`@fastify/rate-limit`):**
   - `POST /api/auth/register`: 5 permintaan / jam / IP.
   - `POST /api/auth/login`: 10 permintaan / 15 menit / IP dan per hash email.
   - Umum: 100 permintaan / menit / IP.
5. **Header, Batas Payload & Logging:**
   - `@fastify/helmet` aktif.
   - Batas body standar `32 KB`; endpoint `/api/sync/push` `256 KB`.
   - Mendukung `TRUST_PROXY` untuk pembacaan IP asli di belakang reverse proxy.
   - Logger Fastify meredaksi `req.headers.cookie`, `req.headers.authorization`, serta field `password` dan `email`. Tidak mencatat isi payload permintaan.

---

## 7. Keputusan Hosting yang Masih Terbuka

Keputusan berikut perlu ditetapkan oleh pemilik proyek sebelum deploy produksi:
1. **Topologi Proxy `/api`:** Menggunakan Vercel/Netlify rewrites ke backend terpisah (Fly.io / Railway / Render / VPS), atau meletakkan frontend + backend di belakang satu reverse proxy (Caddy/Nginx) pada domain yang sama.
2. **Penyedia PostgreSQL Managed:** Neon, Supabase, Railway Postgres, Render Postgres, atau PostgreSQL di VPS mandiri.
3. **Penjadwalan Pembersihan Berkala:** Menjalankan skrip pembersihan sesi kedaluwarsa dan penanda hapus (`deleted_at > 90 hari`) via cron VPS atau scheduled job penyedia hosting.
