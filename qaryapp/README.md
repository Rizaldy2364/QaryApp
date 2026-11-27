# QaryApp

Aplikasi web pendamping ibadah harian yang bersih, cepat, dan bebas gangguan (distraction-free).

## Perintah Pengembangan & Pengujian

- `pnpm dev` : Menjalankan server pengembangan frontend (`http://localhost:5173`) dan backend (`http://localhost:3000`) secara bersamaan
- `pnpm dev:web` : Menjalankan hanya frontend web (Vite)
- `pnpm dev:server` : Menjalankan hanya backend Fastify di folder `server/`
- `pnpm build` : Membangun aplikasi untuk produksi
- `pnpm lint` : Menjalankan pemeriksaan kode dengan ESLint
- `pnpm test` : Menjalankan unit test dengan Vitest
- `pnpm data:check` : Memverifikasi integritas data doa, dzikir, dan lisensi
- `pnpm check:contrast` : Memeriksa rasio kontras warna WCAG untuk tema Terang dan Gelap
- `pnpm check` : Menjalankan seluruh rangkaian verifikasi kualitas (lint, test, data:check, check:contrast, build)

### Menjalankan Backend Akun & Sinkronisasi Bersamaan

Perintah `pnpm dev` di folder `qaryapp/` otomatis menjalankan keduanya sekaligus:
1. Backend Fastify + PostgreSQL di folder `server/` pada `http://localhost:3000` (lihat [server/README.md](server/README.md) untuk persiapan database).
2. Frontend web Vite pada `http://localhost:5173` (permintaan `/api/*` otomatis diteruskan ke backend).

## Dokumentasi Kualitas & Arsitektur

- [docs/prd.md](docs/prd.md) — Kebutuhan produk dan batasan ruang lingkup
- [docs/desain.md](docs/desain.md) — Panduan desain visual, warna, dan komponen
- [docs/agent.md](docs/agent.md) — Panduan tata kerja dan aturan AI agent
- [docs/auth-design.md](docs/auth-design.md) — Arsitektur backend akun, keamanan cookie, dan sinkronisasi
- [server/README.md](server/README.md) — Panduan menjalankan server backend lokal
- [docs/qa-matrix.md](docs/qa-matrix.md) — Matriks pengujian seluruh rute dan keadaan aplikasi
- [docs/qa-checklist.md](docs/qa-checklist.md) — Panduan pengujian manual pada perangkat fisik Android/iOS
- [docs/offline.md](docs/offline.md) — Penjelasan arsitektur luring (Service Worker & IndexedDB)
- [docs/lighthouse.md](docs/lighthouse.md) — Catatan evaluasi metrik performa dan aksesibilitas Lighthouse
