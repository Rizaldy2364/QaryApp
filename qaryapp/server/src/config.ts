import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type NodeEnv = 'development' | 'test' | 'production'

export interface AppConfig {
  databaseUrl: string
  port: number
  nodeEnv: NodeEnv
  sessionTtlDays: number
  trustProxy: boolean
  allowedOrigins: string[]
}

function tryLoadDotEnv(): void {
  if (process.env.NODE_ENV === 'test' || process.env.DATABASE_URL) {
    return
  }
  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath)
  }
}

function parsePositiveInt(raw: string | undefined, name: string, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback
  }
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Variabel lingkungan ${name} harus berupa bilangan bulat positif, diterima: "${raw}"`)
  }
  return parsed
}

function parseBoolean(raw: string | undefined, name: string, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === '') {
    return fallback
  }
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  throw new Error(`Variabel lingkungan ${name} harus bernilai true/false atau 1/0, diterima: "${raw}"`)
}

function parseNodeEnv(raw: string | undefined): NodeEnv {
  if (!raw || raw.trim() === '') return 'development'
  const val = raw.trim()
  if (val === 'development' || val === 'test' || val === 'production') {
    return val
  }
  throw new Error(`Variabel lingkungan NODE_ENV harus development, test, atau production; diterima: "${raw}"`)
}

export function loadConfig(env?: Record<string, string | undefined>): AppConfig {
  if (!env) {
    tryLoadDotEnv()
  }
  const source = env ?? process.env

  const databaseUrl = source.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('Variabel lingkungan DATABASE_URL wajib diisi (contoh: postgres://postgres:postgres@localhost:5432/qaryapp)')
  }

  const port = parsePositiveInt(source.PORT, 'PORT', 3000)
  if (port > 65535) {
    throw new Error(`Variabel lingkungan PORT harus antara 1 dan 65535, diterima: ${port}`)
  }

  const nodeEnv = parseNodeEnv(source.NODE_ENV)
  const sessionTtlDays = parsePositiveInt(source.SESSION_TTL_DAYS, 'SESSION_TTL_DAYS', 30)
  const trustProxy = parseBoolean(source.TRUST_PROXY, 'TRUST_PROXY', false)

  const allowedOrigins = (source.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return {
    databaseUrl,
    port,
    nodeEnv,
    sessionTtlDays,
    trustProxy,
    allowedOrigins,
  }
}
