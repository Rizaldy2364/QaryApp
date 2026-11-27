import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyInstance } from 'fastify'
import { sql, type Kysely } from 'kysely'
import { validateCsrfRequest } from './auth/csrf.js'
import { registerAuthRoutes } from './auth/routes.js'
import type { AppConfig } from './config.js'
import type { Database } from './db/types.js'
import { registerSyncRoutes } from './sync/routes.js'

export interface BuildAppOptions {
  config: AppConfig
  db: Kysely<Database>
  logger?: boolean
}

export async function buildApp({
  config,
  db,
  logger = config.nodeEnv !== 'test',
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: config.trustProxy,
    bodyLimit: 32 * 1024,
    logger: logger
      ? {
          level: config.nodeEnv === 'production' ? 'info' : 'debug',
          redact: {
            paths: [
              'req.headers.cookie',
              'req.headers.authorization',
              '*.password',
              '*.email',
              'password',
              'email',
            ],
            censor: '[REDACTED]',
          },
        }
      : false,
  })

  await app.register(helmet)
  await app.register(cookie)
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMITED',
        message: 'Terlalu banyak permintaan, silakan coba lagi sebentar lagi',
      },
    }),
  })

  // Proteksi CSRF untuk seluruh metode selain GET dan HEAD
  app.addHook('onRequest', async (request, reply) => {
    const result = validateCsrfRequest({
      method: request.method,
      csrfHeader: request.headers['x-qaryapp'],
      originHeader: request.headers.origin,
      hostHeader: request.headers.host,
      protocol: request.protocol,
      allowedOrigins: config.allowedOrigins,
    })

    if (!result.ok) {
      return reply.status(403).send({
        error: {
          code: 'CSRF_FORBIDDEN',
          message: result.message,
        },
      })
    }
  })

  // Penanganan galat standar berbahasa Indonesia
  app.setErrorHandler((error, _request, reply) => {
    const fastifyErr = error as {
      statusCode?: number
      validation?: unknown
      code?: string
      message?: string
    }

    if (fastifyErr.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data permintaan tidak valid',
        },
      })
    }

    if (fastifyErr.statusCode === 413) {
      return reply.status(413).send({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Ukuran permintaan melebihi batas yang diizinkan',
        },
      })
    }

    if (fastifyErr.statusCode && fastifyErr.statusCode >= 400 && fastifyErr.statusCode < 500) {
      return reply.status(fastifyErr.statusCode).send({
        error: {
          code: fastifyErr.code ?? 'BAD_REQUEST',
          message: fastifyErr.message ?? 'Permintaan tidak dapat diproses',
        },
      })
    }

    app.log.error({ err: error }, 'Unhandled server error')
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
    })
  })

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint tidak ditemukan',
      },
    })
  })

  // Daftarkan semua rute di bawah /api
  await app.register(
    async (api) => {
      api.get('/health', async (_request, reply) => {
        await sql`SELECT 1`.execute(db)
        return reply.status(200).send({ status: 'ok' })
      })

      await registerAuthRoutes(api, { db, config })
      await registerSyncRoutes(api, { db, config })
    },
    { prefix: '/api' },
  )

  return app
}
