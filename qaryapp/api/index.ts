import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from '../server/node_modules/fastify/fastify.js'
import { buildApp } from '../server/src/app.js'
import { loadConfig } from '../server/src/config.js'
import { createDb } from '../server/src/db/index.js'

interface VercelRequest extends IncomingMessage {
  body?: unknown
}

let appPromise: Promise<FastifyInstance> | null = null

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
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

function resolvePayload(req: VercelRequest): Promise<string | Buffer | Record<string, unknown> | undefined> {
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
      return Promise.resolve(req.body as string | Buffer | Record<string, unknown>)
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
    const url = rawUrl.startsWith('/api') ? rawUrl : `/api${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
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
