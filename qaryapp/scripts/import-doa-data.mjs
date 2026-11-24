import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data')
const DOCS_DIR = path.join(ROOT_DIR, 'docs')

// Kategori Doa Harian
const CATEGORIES = [
  { id: 'tidur', name: 'Tidur' },
  { id: 'kamar-mandi', name: 'Kamar Mandi' },
  { id: 'makan-minum', name: 'Makan & Minum' },
  { id: 'wudhu-shalat', name: 'Wudhu & Adzan' },
  { id: 'rumah', name: 'Rumah' },
  { id: 'masjid', name: 'Masjid' },
  { id: 'pakaian', name: 'Pakaian' },
  { id: 'perjalanan', name: 'Perjalanan' },
  { id: 'alam', name: 'Fenomena Alam' },
  { id: 'akhlak-sosial', name: 'Keluarga & Adab' },
  { id: 'perlindungan-kesulitan', name: 'Perlindungan & Hajat' },
]

function getCategoryId(title) {
  const t = title.toLowerCase()
  if (t.includes('tidur')) return 'tidur'
  if (t.includes('kamar mandi')) return 'kamar-mandi'
  if (t.includes('makan') || t.includes('puasa') || t.includes('basmallah')) return 'makan-minum'
  if (t.includes('wudhu') || t.includes('adzan')) return 'wudhu-shalat'
  if (t.includes('masjid')) return 'masjid'
  if (t.includes('rumah')) return 'rumah'
  if (t.includes('pakaian')) return 'pakaian'
  if (t.includes('safar') || t.includes('kendaraan')) return 'perjalanan'
  if (t.includes('hujan') || t.includes('angin')) return 'alam'
  if (t.includes('bersin') || t.includes('orang tua') || t.includes('akhlak')) return 'akhlak-sosial'
  return 'perlindungan-kesulitan'
}

function parseRepeatCount(notes) {
  if (!notes) return 1
  const match = String(notes).match(/(\d+)\s*x/i)
  if (match) {
    const val = parseInt(match[1], 10)
    return isNaN(val) || val < 1 ? 1 : val
  }
  return 1
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Gagal mengunduh ${url}: ${res.status} ${res.statusText}`)
  }
  return await res.json()
}

async function main() {
  console.log('[import-doa-data] Mengambil data dari fitrahive/dua-dhikr...')

  const BASE_URL = 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data/dua-dhikr'
  const dailyRaw = await fetchJson(`${BASE_URL}/daily-dua/id.json`)
  const selectedRaw = await fetchJson(`${BASE_URL}/selected-dua/id.json`)
  const morningRaw = await fetchJson(`${BASE_URL}/morning-dhikr/id.json`)
  const eveningRaw = await fetchJson(`${BASE_URL}/evening-dhikr/id.json`)

  console.log(`[import-doa-data] Terunduh: ${dailyRaw.length} daily-dua, ${selectedRaw.length} selected-dua, ${morningRaw.length} morning-dhikr, ${eveningRaw.length} evening-dhikr`)

  // 1. Proses Doa Harian
  const allDoaRaw = [...dailyRaw, ...selectedRaw]
  const doaList = []
  const skippedDoa = []

  allDoaRaw.forEach((item, index) => {
    // Validasi kelayakan
    if (!item.arabic || !item.arabic.trim() || !item.translation || !item.translation.trim()) {
      skippedDoa.push({ title: item.title, reason: 'Teks Arab atau terjemahan kosong' })
      return
    }

    const id = `doa-${index + 1}`
    const categoryId = getCategoryId(item.title)

    // PENTING: teks Arab TIDAK diubah, dipotong, atau dinormalisasi
    doaList.push({
      id,
      categoryId,
      title: item.title.trim(),
      arabic: item.arabic,
      transliteration: item.latin ? item.latin.trim() : undefined,
      translation: item.translation.trim(),
      source: item.source ? item.source.trim() : undefined,
      fawaid: item.fawaid ? item.fawaid.trim() : undefined,
      reviewStatus: 'unreviewed',
    })
  })

  // 2. Proses Dzikir Pagi
  const morningList = []
  const skippedMorning = []
  morningRaw.forEach((item, index) => {
    if (!item.arabic || !item.arabic.trim() || !item.translation || !item.translation.trim()) {
      skippedMorning.push({ title: item.title, reason: 'Teks Arab atau terjemahan kosong' })
      return
    }

    morningList.push({
      id: `morning-${index + 1}`,
      period: 'morning',
      order: index + 1,
      title: item.title ? item.title.trim() : undefined,
      arabic: item.arabic,
      transliteration: item.latin ? item.latin.trim() : undefined,
      translation: item.translation.trim(),
      repeatCount: parseRepeatCount(item.notes),
      source: item.source ? item.source.trim() : (item.fawaid ? item.fawaid.trim() : undefined),
      reviewStatus: 'unreviewed',
    })
  })

  // 3. Proses Dzikir Petang
  const eveningList = []
  const skippedEvening = []
  eveningRaw.forEach((item, index) => {
    if (!item.arabic || !item.arabic.trim() || !item.translation || !item.translation.trim()) {
      skippedEvening.push({ title: item.title, reason: 'Teks Arab atau terjemahan kosong' })
      return
    }

    eveningList.push({
      id: `evening-${index + 1}`,
      period: 'evening',
      order: index + 1,
      title: item.title ? item.title.trim() : undefined,
      arabic: item.arabic,
      transliteration: item.latin ? item.latin.trim() : undefined,
      translation: item.translation.trim(),
      repeatCount: parseRepeatCount(item.notes),
      source: item.source ? item.source.trim() : (item.fawaid ? item.fawaid.trim() : undefined),
      reviewStatus: 'unreviewed',
    })
  })

  // Simpan ke src/data/doa.json
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const doaPayload = {
    categories: CATEGORIES,
    doa: doaList,
  }
  fs.writeFileSync(
    path.join(DATA_DIR, 'doa.json'),
    JSON.stringify(doaPayload, null, 2),
    'utf-8'
  )
  console.log(`[import-doa-data] Berhasil menulis src/data/doa.json (${doaList.length} doa dalam ${CATEGORIES.length} kategori)`)

  // Simpan ke src/data/dzikir.json
  const dzikirPayload = {
    morning: morningList,
    evening: eveningList,
  }
  fs.writeFileSync(
    path.join(DATA_DIR, 'dzikir.json'),
    JSON.stringify(dzikirPayload, null, 2),
    'utf-8'
  )
  console.log(`[import-doa-data] Berhasil menulis src/data/dzikir.json (${morningList.length} dzikir pagi, ${eveningList.length} dzikir petang)`)

  // 4. Buat docs/data-review.md
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true })
  }

  let reviewMd = '# Tabel Peninjauan Konten Data (Data Review)\n\n'
  reviewMd += '> [!IMPORTANT]\n'
  reviewMd += '> Seluruh entri data di bawah ini berstatus **`unreviewed`** (belum ditinjau oleh manusia). Peninjauan manusia atas keotentikan teks Arab, transliterasi, arti, dan sanad dalil adalah **WAJIB** sebelum rilis produksi aplikasi.\n\n'

  reviewMd += '## 1. Daftar Doa Harian\n\n'
  reviewMd += '| ID | Judul | Kategori | Sumber / Dalil | Status Review |\n'
  reviewMd += '|---|---|---|---|---|\n'
  doaList.forEach((d) => {
    const cat = CATEGORIES.find((c) => c.id === d.categoryId)?.name || d.categoryId
    const src = (d.source || '-').replace(/[\r\n]+/g, ' ')
    reviewMd += `| ${d.id} | ${d.title} | ${cat} | ${src} | \`${d.reviewStatus}\` |\n`
  })

  reviewMd += '\n## 2. Daftar Dzikir Pagi\n\n'
  reviewMd += '| Urutan | ID | Judul | Pengulangan | Sumber / Dalil | Status Review |\n'
  reviewMd += '|---|---|---|---|---|---|\n'
  morningList.forEach((m) => {
    const src = (m.source || '-').replace(/[\r\n]+/g, ' ')
    reviewMd += `| ${m.order} | ${m.id} | ${m.title || '-'} | ${m.repeatCount}x | ${src} | \`${m.reviewStatus}\` |\n`
  })

  reviewMd += '\n## 3. Daftar Dzikir Petang\n\n'
  reviewMd += '| Urutan | ID | Judul | Pengulangan | Sumber / Dalil | Status Review |\n'
  reviewMd += '|---|---|---|---|---|---|\n'
  eveningList.forEach((e) => {
    const src = (e.source || '-').replace(/[\r\n]+/g, ' ')
    reviewMd += `| ${e.order} | ${e.id} | ${e.title || '-'} | ${e.repeatCount}x | ${src} | \`${e.reviewStatus}\` |\n`
  })

  if (skippedDoa.length > 0 || skippedMorning.length > 0 || skippedEvening.length > 0) {
    reviewMd += '\n## 4. Entri yang Dilewati (Skipped)\n\n'
    skippedDoa.forEach((s) => reviewMd += `- Doa: "${s.title}" (${s.reason})\n`)
    skippedMorning.forEach((s) => reviewMd += `- Dzikir Pagi: "${s.title}" (${s.reason})\n`)
    skippedEvening.forEach((s) => reviewMd += `- Dzikir Petang: "${s.title}" (${s.reason})\n`)
  } else {
    reviewMd += '\n## 4. Entri yang Dilewati (Skipped)\n\nTidak ada entri yang dilewati (semua entri valid).\n'
  }

  fs.writeFileSync(path.join(DOCS_DIR, 'data-review.md'), reviewMd, 'utf-8')
  console.log('[import-doa-data] Berhasil menulis docs/data-review.md')
}

main().catch((err) => {
  console.error('[import-doa-data] Galat:', err)
  process.exit(1)
})
