import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// 1. Baca lisensi dari node_modules
const amiriLicensePath = path.join(rootDir, 'node_modules/@fontsource/amiri/LICENSE')
const plusJakartaLicensePath = path.join(rootDir, 'node_modules/@fontsource/plus-jakarta-sans/LICENSE')
const lucideLicensePath = path.join(rootDir, 'node_modules/lucide-react/LICENSE')

const amiriLicense = fs.readFileSync(amiriLicensePath, 'utf8').trim()
const plusJakartaLicense = fs.readFileSync(plusJakartaLicensePath, 'utf8').trim()
const lucideLicense = fs.readFileSync(lucideLicensePath, 'utf8').trim()

// 2. Teks lisensi MIT dari repositori fitrahive/dua-dhikr (Copyright (c) 2023 Fitrahive)
const fitrahiveLicense = `MIT License

Copyright (c) 2023 Fitrahive

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`.trim()

const licenses = [
  {
    id: 'fitrahive-dua-dhikr',
    name: 'fitrahive/dua-dhikr',
    usage: 'Kumpulan data doa harian dan dzikir pagi-petang beserta transliterasi dan terjemahan bahasa Indonesia.',
    licenseName: 'MIT License',
    sourceUrl: 'https://github.com/fitrahive/dua-dhikr',
    attribution: 'Copyright (c) 2023 Fitrahive (MIT License)',
    isApi: false,
    licenseText: fitrahiveLicense,
  },
  {
    id: 'equran-id',
    name: 'EQuran.id API v2',
    usage: 'Penyedia data teks Al-Qur\'an 30 juz (114 surah), terjemahan resmi bahasa Indonesia Kemenag RI, dan murottal audio per ayat.',
    licenseName: 'Layanan API Publik Terbuka',
    sourceUrl: 'https://equran.id/apidev/v2',
    attribution: 'Sumber data teks dan terjemahan Al-Qur\'an merujuk pada Kementerian Agama Republik Indonesia melalui layanan publik EQuran.id.',
    isApi: true,
    licenseText: 'Ketentuan: Layanan API publik tanpa API key. Data teks dan terjemahan merujuk pada Kementerian Agama Republik Indonesia (Kemenag RI). Ketentuan lebih lanjut: lihat situs sumber (https://equran.id).',
  },
  {
    id: 'aladhan',
    name: 'Aladhan API',
    usage: 'Perhitungan jadwal waktu sholat harian dan bulanan berdasarkan koordinat lokasi dan metode hisab resmi.',
    licenseName: 'Islamic Network Open API',
    sourceUrl: 'https://aladhan.com',
    attribution: 'Data jadwal sholat dihitung menggunakan layanan API Aladhan (Islamic Network © 2013–2026).',
    isApi: true,
    licenseText: 'Ketentuan: Layanan API disediakan "sebagaimana adanya" (as-is) tanpa jaminan apa pun oleh Islamic Network © 2013–2026. Perhitungan mengacu pada metode otoritas resmi (Kemenag RI untuk Indonesia). Ketentuan lebih lanjut: lihat situs sumber (https://aladhan.com/terms).',
  },
  {
    id: 'open-meteo',
    name: 'Open-Meteo Geocoding API',
    usage: 'Pencarian nama kota dan penentuan koordinat geografis (latitude, longitude, dan zona waktu).',
    licenseName: 'CC BY 4.0 & GeoNames Attribution',
    sourceUrl: 'https://open-meteo.com/en/docs/geocoding-api',
    attribution: 'Location data based on GeoNames · Geocoding API by Open-Meteo (CC BY 4.0)',
    isApi: true,
    licenseText: 'Ketentuan Atribusi Wajib: "Location data based on GeoNames" serta atribusi layanan Open-Meteo di bawah lisensi Creative Commons Attribution 4.0 International (CC BY 4.0). Ketentuan lebih lanjut: lihat situs sumber (https://open-meteo.com/en/terms).',
  },
  {
    id: 'amiri-font',
    name: 'Font Amiri',
    usage: 'Tipografi teks ayat Al-Qur\'an dan doa dalam aksara Arab bergaya Naskh klasik.',
    licenseName: 'SIL Open Font License 1.1',
    sourceUrl: 'https://github.com/aliftype/amiri',
    attribution: 'Copyright 2010-2022 The Amiri Project Authors (SIL Open Font License, Version 1.1)',
    isApi: false,
    licenseText: amiriLicense,
  },
  {
    id: 'plus-jakarta-sans',
    name: 'Font Plus Jakarta Sans',
    usage: 'Tipografi antarmuka pengguna (teks Latin, judul, tombol, dan navigasi).',
    licenseName: 'SIL Open Font License 1.1',
    sourceUrl: 'https://github.com/tokotype/PlusJakartaSans',
    attribution: 'Copyright 2020 The Plus Jakarta Sans Project Authors (SIL Open Font License, Version 1.1)',
    isApi: false,
    licenseText: plusJakartaLicense,
  },
  {
    id: 'lucide-icons',
    name: 'Lucide Icons',
    usage: 'Ikon antarmuka pengguna yang konsisten di seluruh layar aplikasi.',
    licenseName: 'ISC License',
    sourceUrl: 'https://lucide.dev',
    attribution: 'Copyright (c) 2026 Lucide Icons and Contributors (ISC License)',
    isApi: false,
    licenseText: lucideLicense,
  },
]

const targetPath = path.join(rootDir, 'src/data/licenses.json')
fs.writeFileSync(targetPath, JSON.stringify(licenses, null, 2) + '\n', 'utf8')
console.log(`Berhasil mengekstrak ${licenses.length} lisensi ke ${targetPath}`)
