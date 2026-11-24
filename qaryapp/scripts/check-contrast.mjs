import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const cssPath = path.join(rootDir, 'src/index.css')
const cssContent = fs.readFileSync(cssPath, 'utf8')

// Ekstraksi nilai hex dari blok @theme dan .dark
function extractTokens(content, blockName) {
  const tokens = {}
  let regex
  if (blockName === '@theme') {
    regex = /@theme\s*\{([^}]+)\}/s
  } else {
    regex = /\.dark\s*\{([^}]+)\}/s
  }
  const match = content.match(regex)
  if (!match) return tokens

  const lines = match[1].split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const propMatch = trimmed.match(/--color-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6});/)
    if (propMatch) {
      tokens[propMatch[1]] = propMatch[2]
    }
  }
  return tokens
}

const lightTokens = extractTokens(cssContent, '@theme')
const darkTokens = extractTokens(cssContent, '.dark')

// Konversi Hex ke Luminansi Relatif WCAG
function hexToLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const transform = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
}

function calculateContrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1)
  const l2 = hexToLuminance(hex2)
  const brightest = Math.max(l1, l2)
  const darkest = Math.min(l1, l2)
  return (brightest + 0.05) / (darkest + 0.05)
}

// Pasangan pengujian rasio kontras sesuai Tugas D.1
const checks = [
  { fg: 'text', bg: 'bg', min: 4.5, desc: 'text dengan bg' },
  { fg: 'text', bg: 'surface', min: 4.5, desc: 'text dengan surface' },
  { fg: 'text-muted', bg: 'bg', min: 4.5, desc: 'text-muted dengan bg' },
  { fg: 'text-muted', bg: 'surface', min: 4.5, desc: 'text-muted dengan surface' },
  { fg: 'text-muted', bg: 'primary-soft', min: 4.5, desc: 'text-muted dengan primary-soft' },
  { fg: 'primary-fg', bg: 'primary', min: 4.5, desc: 'primary-fg dengan primary' },
  { fg: 'primary-ink', bg: 'primary-soft', min: 4.5, desc: 'primary-ink dengan primary-soft' },
  { fg: 'primary', bg: 'surface', min: 3.0, desc: 'primary dengan surface (ikon)' },
  { fg: 'danger', bg: 'surface', min: 4.5, desc: 'danger dengan surface' },
  { fg: 'danger', bg: 'danger-soft', min: 3.0, desc: 'danger dengan danger-soft' },
  { fg: 'gold', bg: 'surface', min: 3.0, desc: 'gold dengan surface (ikon)' },
]

console.log('=== PEMERIKSAAN RASIO KONTRAS WCAG TOKEN WARNA ===\n')

let hasError = false
const results = []

for (const theme of ['light', 'dark']) {
  console.log(`--- TEMA ${theme.toUpperCase()} ---`)
  const tokens = theme === 'light' ? lightTokens : darkTokens

  for (const check of checks) {
    const fgHex = tokens[check.fg]
    const bgHex = tokens[check.bg]

    if (!fgHex || !bgHex) {
      console.error(`[GALAT] Token tidak ditemukan: fg:${check.fg} (${fgHex}), bg:${check.bg} (${bgHex})`)
      hasError = true
      continue
    }

    const ratio = calculateContrastRatio(fgHex, bgHex)
    const passed = ratio >= check.min
    if (!passed) hasError = true

    const statusStr = passed ? '✓ LULUS' : '✗ GAGAL'
    console.log(
      `${statusStr} | ${check.desc.padEnd(34)} | ${ratio.toFixed(2)}:1 (Min: ${check.min}:1) | [${check.fg}: ${fgHex}] vs [${check.bg}: ${bgHex}]`
    )

    results.push({
      theme,
      desc: check.desc,
      ratio: Number(ratio.toFixed(2)),
      min: check.min,
      passed,
      fg: `${check.fg} (${fgHex})`,
      bg: `${check.bg} (${bgHex})`,
    })
  }
  console.log('')
}

if (hasError) {
  console.error('Pemeriksaan kontras WCAG menemukan rasio di bawah ambang standar.')
  process.exit(1)
} else {
  console.log('✓ Seluruh pengujian rasio kontras WCAG LULUS dengan sempurna.')
}
