import { existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { FastifyInstance } from '../server/node_modules/fastify/fastify.js'
import type { AppConfig } from '../server/src/config.js'

declare const __dirname: string | undefined

interface VercelRequest extends IncomingMessage {
  body?: unknown
}

interface ServerModules {
  buildApp: (opts: {
    config: AppConfig
    db: unknown
    logger?: boolean
  }) => Promise<FastifyInstance>
  loadConfig: (env?: Record<string, string | undefined>) => AppConfig
  createDb: (databaseUrl: string) => { db: unknown }
}

// Gunakan native ESM import() agar runtime CommonJS Vercel tidak mengubahnya menjadi require()
const nativeImport = new Function(
  'specifier',
  'return import(specifier)',
) as <T>(specifier: string) => Promise<T>

let appPromise: Promise<FastifyInstance> | null = null

function resolveServerDistDir(): string {
  const baseDirs: string[] = []

  try {
    if (typeof import.meta?.url === 'string' && import.meta.url.length > 0) {
      baseDirs.push(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'dist'))
    }
  } catch {
    // Abaikan jika import.meta.url tidak tersedia di runtime CJS
  }

  if (typeof __dirname === 'string' && __dirname.length > 0) {
    baseDirs.push(resolve(__dirname, '..', 'server', 'dist'))
  }

  baseDirs.push(
    resolve(process.cwd(), 'server', 'dist'),
    resolve(process.cwd(), 'qaryapp', 'server', 'dist'),
    '/var/task/qaryapp/server/dist',
    '/var/task/server/dist',
  )

  const uniqueCandidates = [...new Set(baseDirs)]
  const found = uniqueCandidates.find((dir) => existsSync(resolve(dir, 'app.js')))

  if (!found) {
    console.error('server/dist/app.js tidak ditemukan. Kandidat yang diperiksa:', {
      candidates: uniqueCandidates,
      cwd: process.cwd(),
    })
    throw new Error(
      `Cannot find server/dist/app.js. Checked: ${uniqueCandidates.join(', ')}`,
    )
  }

  return found
}

async function loadServerModules(): Promise<ServerModules> {
  const serverDistDir = resolveServerDistDir()
  const [appMod, configMod, dbMod] = await Promise.all([
    nativeImport<{ buildApp: ServerModules['buildApp'] }>(
      pathToFileURL(resolve(serverDistDir, 'app.js')).href,
    ),
    nativeImport<{ loadConfig: ServerModules['loadConfig'] }>(
      pathToFileURL(resolve(serverDistDir, 'config.js')).href,
    ),
    nativeImport<{ createDb: ServerModules['createDb'] }>(
      pathToFileURL(resolve(serverDistDir, 'db', 'index.js')).href,
    ),
  ])

  return {
    buildApp: appMod.buildApp,
    loadConfig: configMod.loadConfig,
    createDb: dbMod.createDb,
  }
}

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const { buildApp, loadConfig, createDb } = await loadServerModules()
      const config = loadConfig({
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
        TRUST_PROXY: process.env.TRUST_PROXY || 'true',
      })
      const { db } = createDb(config.databaseUrl)
      const app = await buildApp({ config, db, logger: false })
      await app.ready()
      return app
    })().catch((err) => {
      appPromise = null
      throw err
    })
  }
  return appPromise
}

async function readRawBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

function resolvePayload(
  req: VercelRequest,
): Promise<string | Buffer | Record<string, unknown> | undefined> {
  const method = (req.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') {
    return Promise.resolve(undefined)
  }

  if (req.body !== undefined) {
    if (
      typeof req.body === 'string' ||
      Buffer.isBuffer(req.body) ||
      typeof req.body === 'object'
    ) {
      return Promise.resolve(
        req.body as string | Buffer | Record<string, unknown>,
      )
    }
    return Promise.resolve(String(req.body))
  }

  return readRawBody(req)
}

export default async function handler(
  req: VercelRequest,
  res: ServerResponse,
): Promise<void> {
  try {
    const app = await getApp()
    const rawUrl = req.url || '/api'
    const url = rawUrl.startsWith('/api')
      ? rawUrl
      : `/api${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
    const payload = await resolvePayload(req)

    const response = await app.inject({
      method: (req.method || 'GET') as
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'DELETE'
        | 'HEAD'
        | 'OPTIONS',
      url,
      headers: req.headers,
      payload,
    })

    res.statusCode = response.statusCode
    for (const [key, value] of Object.entries(response.headers)) {
      if (value === undefined || value === null) continue
      if (key.toLowerCase() === 'transfer-encoding') continue
      if (Array.isArray(value)) {
        res.setHeader(key, value.map(String))
      } else if (typeof value === 'number' || typeof value === 'string') {
        res.setHeader(key, value)
      }
    }

    res.end(response.rawPayload)
  } catch (err) {
    console.error('Vercel API adapter error:', err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Terjadi kesalahan pada server',
          },
        }),
      )
    }
  }
}
