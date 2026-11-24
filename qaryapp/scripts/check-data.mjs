import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data')

const isStrict = process.argv.includes('--strict')

function check() {
  console.log('=== PEMERIKSAAN INTEGRITAS DATA DOA & DZIKIR ===')
  if (isStrict) {
    console.log('[Mode: STRICT - Wajib semua entri "reviewed"]')
  }

  const doaPath = path.join(DATA_DIR, 'doa.json')
  const dzikirPath = path.join(DATA_DIR, 'dzikir.json')

  if (!fs.existsSync(doaPath)) {
    console.error('GALAT: Berkas src/data/doa.json tidak ditemukan!')
    process.exit(1)
  }
  if (!fs.existsSync(dzikirPath)) {
    console.error('GALAT: Berkas src/data/dzikir.json tidak ditemukan!')
    process.exit(1)
  }

  const doaData = JSON.parse(fs.readFileSync(doaPath, 'utf-8'))
  const dzikirData = JSON.parse(fs.readFileSync(dzikirPath, 'utf-8'))

  const errors = []
  let totalDoa = 0
  let unreviewedDoa = 0
  let totalDzikir = 0
  let unreviewedDzikir = 0

  // 1. Periksa Kategori Doa
  const categoryIds = new Set(doaData.categories.map((c) => c.id))
  if (categoryIds.size !== doaData.categories.length) {
    errors.push('Terdapat ID kategori yang duplikat pada doa.json')
  }

  // 2. Periksa Entri Doa
  const doaIdSet = new Set()
  totalDoa = doaData.doa.length
  doaData.doa.forEach((item, idx) => {
    if (!item.id) errors.push(`Doa index ${idx} tidak memiliki ID`)
    if (doaIdSet.has(item.id)) errors.push(`ID Doa duplikat: ${item.id}`)
    doaIdSet.add(item.id)

    if (!item.title || !item.title.trim()) errors.push(`Doa ${item.id} tidak memiliki judul`)
    if (!item.arabic || !item.arabic.trim()) errors.push(`Doa ${item.id} tidak memiliki teks Arab`)
    if (!item.translation || !item.translation.trim()) errors.push(`Doa ${item.id} tidak memiliki arti`)
    if (!categoryIds.has(item.categoryId)) {
      errors.push(`Doa ${item.id} memakai kategori tidak dikenal: ${item.categoryId}`)
    }

    if (item.reviewStatus === 'unreviewed') {
      unreviewedDoa++
    }
  })

  // 3. Periksa Dzikir Pagi & Petang
  const periods = ['morning', 'evening']
  const dzikirIdSet = new Set()

  periods.forEach((period) => {
    const list = dzikirData[period]
    if (!Array.isArray(list)) {
      errors.push(`Dzikir periode ${period} bukan array`)
      return
    }

    totalDzikir += list.length
    const orderSet = new Set()

    list.forEach((item, idx) => {
      if (!item.id) errors.push(`Dzikir ${period} index ${idx} tidak memiliki ID`)
      if (dzikirIdSet.has(item.id)) errors.push(`ID Dzikir duplikat: ${item.id}`)
      dzikirIdSet.add(item.id)

      if (orderSet.has(item.order)) {
        errors.push(`Dzikir ${period} memiliki urutan bertabrakan pada nomor: ${item.order}`)
      }
      orderSet.add(item.order)

      if (!item.arabic || !item.arabic.trim()) {
        errors.push(`Dzikir ${item.id} tidak memiliki teks Arab`)
      }
      if (!item.translation || !item.translation.trim()) {
        errors.push(`Dzikir ${item.id} tidak memiliki arti`)
      }
      if (!Number.isInteger(item.repeatCount) || item.repeatCount < 1) {
        errors.push(`Dzikir ${item.id} repeatCount harus bilangan bulat >= 1, ditemukan: ${item.repeatCount}`)
      }

      if (item.reviewStatus === 'unreviewed') {
        unreviewedDzikir++
      }
    })
  })

  // Laporan Hasil
  console.log('\n--- Ringkasan Data ---')
  console.log(`- Kategori Doa   : ${categoryIds.size} kategori`)
  console.log(`- Total Doa      : ${totalDoa} entri (${unreviewedDoa} unreviewed, ${totalDoa - unreviewedDoa} reviewed)`)
  console.log(`- Total Dzikir   : ${totalDzikir} entri (${unreviewedDzikir} unreviewed, ${totalDzikir - unreviewedDzikir} reviewed)`)
  console.log(`  * Dzikir Pagi  : ${dzikirData.morning?.length ?? 0} entri`)
  console.log(`  * Dzikir Petang: ${dzikirData.evening?.length ?? 0} entri`)

  if (errors.length > 0) {
    console.error('\nGALAT INTEGRITAS DATA DITEMUKAN:')
    errors.forEach((err) => console.error(` ✗ ${err}`))
    process.exit(1)
  }

  console.log('\n✓ Seluruh aturan integritas data (ID unik, non-kosong, repeatCount, kategori, dan urutan) TERPENUHI.')

  const totalUnreviewed = unreviewedDoa + unreviewedDzikir
  if (isStrict && totalUnreviewed > 0) {
    console.error(`\n[STRICT CHECK GAGAL] Masih terdapat ${totalUnreviewed} entri 'unreviewed'. Mohon lakukan peninjauan manusia sebelum rilis.`)
    process.exit(1)
  }

  console.log('✓ Pemeriksaan selesai dengan sukses.\n')
}

check()
