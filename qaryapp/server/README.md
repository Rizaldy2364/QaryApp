# QaryApp Backend Server (Fase 2)

Layanan backend opsional untuk akun pengguna dan sinkronisasi data antar perangkat (bookmark ayat, doa favorit, dan posisi bacaan terakhir). Dibangun menggunakan **Fastify**, **PostgreSQL**, dan **Kysely**.

---

## Prasyarat

- **Node.js** v24+ (mendukung `--experimental-strip-types`)
- **pnpm**
- **PostgreSQL** 15+ (lokal atau melalui Docker)

---

## 1. Menyiapkan PostgreSQL Lokal (Docker)

Jika menggunakan Docker, jalankan PostgreSQL dengan perintah berikut:

```bash
docker run --name qaryapp-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=qaryapp \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Atau jika menggunakan PostgreSQL yang sudah terpasang di sistem, buat database `qaryapp` terlebih dahulu.

---

## 2. Konfigurasi Environment

Salin `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Sesuaikan `DATABASE_URL` dan variabel lain di `.env`. Pastikan file `.env` tidak pernah di-commit ke repositori.

---

## 3. Instalasi & Migrasi

```bash
pnpm install
pnpm migrate
```

Untuk membatalkan migrasi terakhir (*rollback*):

```bash
pnpm migrate:down
```

---

## 4. Menjalankan Server

Mode pengembangan (*hot reload*):

```bash
pnpm dev
```

Build dan jalankan mode produksi:

```bash
pnpm build
pnpm start
```

Server akan berjalan di `http://localhost:3000` (atau sesuai `PORT` pada `.env`).

---

## 5. Pengujian & Pembersihan

- **Unit test:** `pnpm test`
- **Integration test (dengan database):**
  ```bash
  TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/qaryapp_test pnpm test
  ```
- **Smoke test terhadap server yang sedang berjalan:**
  ```bash
  pnpm smoke
  ```
- **Pembersihan sesi kedaluwarsa & penanda hapus >90 hari:**
  ```bash
  pnpm cleanup
  ```
