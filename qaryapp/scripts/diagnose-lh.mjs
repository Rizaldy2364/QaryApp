import { spawn } from 'node:child_process'

const preview = spawn('cmd.exe', ['/c', 'pnpm', 'preview', '--port', '4173', '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
})

await new Promise((r) => setTimeout(r, 2500))

const lh = spawn(
  'cmd.exe',
  [
    '/c',
    'npx',
    '--yes',
    'lighthouse',
    'http://localhost:4173/',
    '--chrome-flags="--headless=new --no-sandbox --disable-gpu"',
    '--form-factor=mobile',
    '--screenEmulation.mobile=true',
    '--only-categories=accessibility,seo',
    '--output=json',
    '--quiet',
  ],
  { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 20 }
)

let stdout = ''
lh.stdout.on('data', (d) => (stdout += d))

lh.on('close', () => {
  preview.kill()
  try {
    const rep = JSON.parse(stdout)
    console.log('ACCESSIBILITY SCORE:', rep.categories.accessibility?.score * 100)
    console.log('SEO SCORE:', rep.categories.seo?.score * 100)

    console.log('\n--- Failed/Warning Accessibility Audits: ---')
    Object.entries(rep.audits).forEach(([id, a]) => {
      if (rep.categories.accessibility?.auditRefs?.some((r) => r.id === id) && a.score !== 1 && a.score !== null) {
        console.log(`[${id}] ${a.title}: ${a.explanation || a.displayValue || ''}`)
        if (a.details?.items) {
          console.log(JSON.stringify(a.details.items.map((it) => it.node?.snippet || it), null, 2))
        }
      }
    })

    console.log('\n--- Failed/Warning SEO Audits: ---')
    Object.entries(rep.audits).forEach(([id, a]) => {
      if (rep.categories.seo?.auditRefs?.some((r) => r.id === id) && a.score !== 1 && a.score !== null) {
        console.log(`[${id}] ${a.title}: ${a.explanation || a.displayValue || ''}`)
        if (a.details?.items) {
          console.log(JSON.stringify(a.details.items.map((it) => it.node?.snippet || it), null, 2))
        }
      }
    })
  } catch (e) {
    console.error('Error:', e.message)
  }
})
