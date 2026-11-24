import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
process.env.CHROME_PATH = chromePath

const routes = ['/', '/quran/1', '/dzikir']
const ITERATIONS = 3

console.log('Memulai Vite Preview port 4173...')
const preview = spawn('cmd.exe', ['/c', 'pnpm', 'preview', '--port', '4173', '--strictPort'], {
  cwd: rootDir,
  stdio: 'pipe',
})

await new Promise((r) => setTimeout(r, 2000))

async function runLighthouse(url) {
  return new Promise((resolve) => {
    const lh = spawn(
      'cmd.exe',
      [
        '/c',
        'npx',
        '--yes',
        'lighthouse',
        url,
        '--chrome-flags="--headless=new --no-sandbox --disable-gpu"',
        '--form-factor=mobile',
        '--screenEmulation.mobile=true',
        '--only-categories=performance',
        '--output=json',
        '--quiet',
      ],
      { cwd: rootDir, maxBuffer: 1024 * 1024 * 30 }
    )

    let stdout = ''
    let stderr = ''
    lh.stdout.on('data', (d) => (stdout += d))
    lh.stderr.on('data', (d) => (stderr += d))

    lh.on('close', (code) => {
      try {
        const report = JSON.parse(stdout)
        const perf = Math.round((report.categories.performance?.score || 0) * 100)
        const lcpAudit = report.audits['largest-contentful-paint']
        const tbtAudit = report.audits['total-blocking-time']
        const clsAudit = report.audits['cumulative-layout-shift']
        const lcpElementAudit = report.audits['largest-contentful-paint-element']

        const lcp = lcpAudit?.numericValue || 0
        const tbt = tbtAudit?.numericValue || 0
        const cls = clsAudit?.numericValue || 0
        const lcpNode = lcpElementAudit?.details?.items?.[0]?.node?.snippet || lcpElementAudit?.details?.items?.[0]?.node?.nodeLabel || 'Tidak terdeteksi'

        resolve({
          code,
          performance: perf,
          lcpMs: Math.round(lcp),
          tbtMs: Math.round(tbt),
          cls: Number(cls.toFixed(3)),
          lcpElement: lcpNode,
        })
      } catch (err) {
        resolve({ code: 1, error: err.message, stderr })
      }
    })
  })
}

function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a.performance - b.performance)
  return sorted[Math.floor(sorted.length / 2)]
}

const summary = {}

try {
  for (const route of routes) {
    const url = `http://localhost:4173${route}`
    console.log(`\n=== Menguji Rute: ${route} (3x) ===`)
    const runs = []
    for (let i = 1; i <= ITERATIONS; i++) {
      process.stdout.write(`- Run #${i}... `)
      const res = await runLighthouse(url)
      console.log(`Perf: ${res.performance} | LCP: ${res.lcpMs}ms | TBT: ${res.tbtMs}ms | CLS: ${res.cls}`)
      runs.push(res)
    }
    const median = getMedian(runs)
    summary[route] = { runs, median }
    console.log(`>>> MEDIAN ${route}: Perf: ${median.performance} | LCP: ${median.lcpMs}ms | TBT: ${median.tbtMs}ms | CLS: ${median.cls} | Elemen LCP: ${median.lcpElement}`)
  }
} finally {
  console.log('\nMenghentikan preview server...')
  preview.kill()
  fs.writeFileSync(path.join(rootDir, 'scripts', 'lh-baseline.json'), JSON.stringify(summary, null, 2))
}
