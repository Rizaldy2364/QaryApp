# QaryApp

Aplikasi web pendamping ibadah harian yang bersih, cepat, dan bebas gangguan (distraction-free).

## Perintah Pengembangan & Pengujian

- `pnpm dev` : Menjalankan server pengembangan lokal
- `pnpm build` : Membangun aplikasi untuk produksi
- `pnpm lint` : Menjalankan pemeriksaan kode dengan ESLint
- `pnpm test` : Menjalankan unit test dengan Vitest
- `pnpm data:check` : Memverifikasi integritas data doa, dzikir, dan lisensi
- `pnpm check:contrast` : Memeriksa rasio kontras warna WCAG untuk tema Terang dan Gelap
- `pnpm check` : Menjalankan seluruh rangkaian verifikasi kualitas (lint, test, data:check, check:contrast, build)

## Dokumentasi Kualitas & Arsitektur

- [docs/prd.md](docs/prd.md) — Kebutuhan produk dan batasan ruang lingkup
- [docs/desain.md](docs/desain.md) — Panduan desain visual, warna, dan komponen
- [docs/agent.md](docs/agent.md) — Panduan tata kerja dan aturan AI agent
- [docs/qa-matrix.md](docs/qa-matrix.md) — Matriks pengujian seluruh rute dan keadaan aplikasi
- [docs/qa-checklist.md](docs/qa-checklist.md) — Panduan pengujian manual pada perangkat fisik Android/iOS
- [docs/offline.md](docs/offline.md) — Penjelasan arsitektur luring (Service Worker & IndexedDB)
- [docs/lighthouse.md](docs/lighthouse.md) — Catatan evaluasi metrik performa dan aksesibilitas Lighthouse
