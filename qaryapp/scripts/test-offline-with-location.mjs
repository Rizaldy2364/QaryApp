import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const tempUserData = path.join(rootDir, '.chrome-offline-test')
if (fs.existsSync(tempUserData)) {
  fs.rmSync(tempUserData, { recursive: true, force: true })
}
fs.mkdirSync(tempUserData, { recursive: true })

console.log('1. Memulai server preview port 4173...')
const preview = spawn('cmd.exe', ['/c', 'pnpm', 'preview', '--port', '4173', '--strictPort'], {
  cwd: rootDir,
  stdio: 'pipe',
})

await new Promise((r) => setTimeout(r, 2500))

console.log('2. Memulai Chrome headless...')
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempUserData}`,
    'http://localhost:4173/',
  ],
  { stdio: 'ignore' }
)

await new Promise((r) => setTimeout(r, 3000))

async function getWsUrl() {
  const res = await fetch('http://127.0.0.1:9222/json')
  const tabs = await res.json()
  const pageTab = tabs.find((t) => t.type === 'page')
  return pageTab?.webSocketDebuggerUrl
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.callbacks = new Map()
    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id)
        this.callbacks.delete(data.id)
        if (data.error) reject(data.error)
        else resolve(data.result)
      }
    }
  }

  ready() {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve()
      this.ws.onopen = () => resolve()
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
}

const wsUrl = await getWsUrl()
const client = new CDPClient(wsUrl)
await client.ready()
await client.send('Page.enable')
await client.send('Network.enable')
await client.send('Runtime.enable')

console.log('3. Menyetel lokasi Yogyakarta di pengaturan...')
const setupScript = `
  const settings = {
    theme: 'system',
    arabSize: 'medium',
    showTranslation: true,
    showTransliteration: false,
    location: {
      country: 'Indonesia',
      city: 'Yogyakarta',
      source: 'manual',
      coordinates: { latitude: -7.7956, longitude: 110.3695 }
    }
  };
  localStorage.setItem('qaryapp:settings', JSON.stringify(settings));
`
await client.send('Runtime.evaluate', { expression: setupScript })

console.log('4. Pemanasan daring (memuat Beranda, Jadwal Sholat, Al-Qur\'an, Bookmark, Favorit Doa)...')
// Muat Beranda
await client.send('Page.navigate', { url: 'http://localhost:4173/' })
await new Promise((r) => setTimeout(r, 4500))

// Muat Jadwal Sholat
await client.send('Page.navigate', { url: 'http://localhost:4173/jadwal-sholat' })
await new Promise((r) => setTimeout(r, 4500))

// Muat Surah Al-Fatihah (1)
await client.send('Page.navigate', { url: 'http://localhost:4173/quran/1' })
await new Promise((r) => setTimeout(r, 4000))

// Tambahkan Bookmark ayat 1 dan Favorit doa via evaluated script pada origin
await client.send('Runtime.evaluate', {
  expression: `
    (async () => {
      const { toggleBookmark } = await import('/src/lib/storage/index.ts');
      // atau langsung simpan ke IndexedDB bila modul tersedia
    })()
  `
})

// Muat Doa Sebelum Tidur
await client.send('Page.navigate', { url: 'http://localhost:4173/doa/doa-1' })
await new Promise((r) => setTimeout(r, 2000))

// Muat Tersimpan, Dzikir, Profil, Kiblat
await client.send('Page.navigate', { url: 'http://localhost:4173/tersimpan' })
await new Promise((r) => setTimeout(r, 1500))
await client.send('Page.navigate', { url: 'http://localhost:4173/dzikir' })
await new Promise((r) => setTimeout(r, 1500))
await client.send('Page.navigate', { url: 'http://localhost:4173/profil' })
await new Promise((r) => setTimeout(r, 1500))
await client.send('Page.navigate', { url: 'http://localhost:4173/kiblat' })
await new Promise((r) => setTimeout(r, 1500))

// Tunggu Service Worker stabil
await new Promise((r) => setTimeout(r, 2500))

console.log('\n5. Mengaktifkan mode luring (Network offline = true)...')
await client.send('Network.emulateNetworkConditions', {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
})

console.log('\n6. Menguji pemuatan ulang saat LURING untuk setiap halaman...')
const testRoutes = [
  {
    name: 'Beranda',
    url: 'http://localhost:4173/',
    check: `
      const text = document.body.innerText;
      const hasCity = text.includes('Yogyakarta');
      const hasPrayers = text.includes('Subuh') && text.includes('Dzuhur');
      const hasCountdown = text.includes('lagi') || text.includes('Telah masuk');
      const hasOfflineBadge = text.includes('Offline') || text.includes('Tersimpan') || text.includes('luring');
      JSON.stringify({ hasCity, hasPrayers, hasCountdown, hasOfflineBadge });
    `,
  },
  {
    name: 'Jadwal Sholat',
    url: 'http://localhost:4173/jadwal-sholat',
    check: `
      const text = document.body.innerText;
      const hasTable = text.includes('Subuh') && text.includes('Isya');
      const hasCity = text.includes('Yogyakarta');
      JSON.stringify({ hasTable, hasCity });
    `,
  },
  {
    name: 'Al-Qur\'an Surah Pernah Dibuka (1)',
    url: 'http://localhost:4173/quran/1',
    check: `
      const text = document.body.innerText;
      const hasAyat = text.includes('Al-Fatihah') && text.includes('الرَّحْمٰنِ');
      JSON.stringify({ hasAyat });
    `,
  },
  {
    name: 'Al-Qur\'an Surah BELUM Pernah Dibuka (2)',
    url: 'http://localhost:4173/quran/2',
    check: `
      const text = document.body.innerText;
      const isBlank = text.trim().length === 0;
      const hasClearMessage = text.includes('Gagal') || text.includes('koneksi') || text.includes('kembali') || text.includes('Coba');
      JSON.stringify({ isBlank, hasClearMessage });
    `,
  },
  {
    name: 'Tersimpan',
    url: 'http://localhost:4173/tersimpan',
    check: `
      const text = document.body.innerText;
      const hasTabs = text.includes('Ayat') && text.includes('Doa');
      JSON.stringify({ hasTabs });
    `,
  },
  {
    name: 'Doa Harian',
    url: 'http://localhost:4173/doa',
    check: `
      const text = document.body.innerText;
      const hasDoa = text.includes('Doa Harian') && text.includes('Sebelum Tidur');
      JSON.stringify({ hasDoa });
    `,
  },
  {
    name: 'Dzikir Pagi-Petang',
    url: 'http://localhost:4173/dzikir',
    check: `
      const text = document.body.innerText;
      const hasDzikir = text.includes('Dzikir Pagi') || text.includes('Dzikir Petang');
      JSON.stringify({ hasDzikir });
    `,
  },
  {
    name: 'Profil',
    url: 'http://localhost:4173/profil',
    check: `
      const text = document.body.innerText;
      const hasSettings = text.includes('Pengaturan') && text.includes('Tema');
      JSON.stringify({ hasSettings });
    `,
  },
  {
    name: 'Kompas Kiblat',
    url: 'http://localhost:4173/kiblat',
    check: `
      const text = document.body.innerText;
      const hasCompass = text.includes('Qibla Compass') || text.includes('Kompas Kiblat') || text.includes('Vertical');
      JSON.stringify({ hasCompass });
    `,
  },
]

const finalResults = []

for (const tr of testRoutes) {
  try {
    await client.send('Page.navigate', { url: tr.url })
    await new Promise((r) => setTimeout(r, 2000))

    const evalTitle = await client.send('Runtime.evaluate', { expression: 'document.title' })
    const title = evalTitle.result?.value || ''

    const evalDetails = await client.send('Runtime.evaluate', { expression: tr.check })
    const rawDetails = evalDetails.result?.value
    let parsedDetails = {}
    try {
      parsedDetails = JSON.parse(rawDetails)
    } catch {}

    const reloaded = title.includes('QaryApp')

    finalResults.push({
      name: tr.name,
      url: tr.url,
      title,
      reloaded: reloaded ? 'Ya' : 'Tidak',
      details: parsedDetails,
    })

    console.log(`- ${tr.name.padEnd(35)}: Reloaded=${reloaded ? 'Ya' : 'Tidak'} | Title="${title}"`)
    console.log(`  Detail:`, parsedDetails)
  } catch (err) {
    console.error(`- ${tr.name} ERROR:`, err.message)
  }
}

console.log('\n=== REKAP LENGKAP HASIL UJI LURING DENGAN LOKASI ===')
console.log(JSON.stringify(finalResults, null, 2))

preview.kill()
chrome.kill()
process.exit(0)
