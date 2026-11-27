import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/types.js'
import { createRequireAuth } from './middleware.js'
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password.js'
import {
  SESSION_COOKIE_NAME,
  buildClearCookieOptions,
  buildSessionCookieOptions,
  createSession,
  deleteSessionByToken,
} from './session.js'

interface AuthRoutesDeps {
  db: Kysely<Database>
  config: AppConfig
}

const LOGIN_EMAIL_WINDOW_MS = 15 * 60 * 1000
const LOGIN_EMAIL_MAX_ATTEMPTS = 10

class EmailRateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()

  checkAndConsume(normalizedEmail: string): boolean {
    const key = createHash('sha256').update(normalizedEmail).digest('hex')
    const now = Date.now()
    const entry = this.buckets.get(key)

    if (!entry || entry.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + LOGIN_EMAIL_WINDOW_MS })
      return true
    }

    if (entry.count >= LOGIN_EMAIL_MAX_ATTEMPTS) {
      return false
    }

    entry.count += 1
    return true
  }
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  { db, config }: AuthRoutesDeps,
): Promise<void> {
  const requireAuth = createRequireAuth(db, config)
  const emailRateLimiter = new EmailRateLimiter()

  app.post<{
    Body: {
      email: string
      password: string
      displayName?: string
    }
  }>(
    '/auth/register',
    {
      bodyLimit: 32 * 1024,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          additionalProperties: false,
          properties: {
            email: { type: 'string', format: 'email', maxLength: 254 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
            displayName: { type: 'string', minLength: 1, maxLength: 80 },
          },
        },
      },
    },
    async (request, reply) => {
      const normalizedEmail = request.body.email.trim().toLowerCase()
      const displayName = request.body.displayName?.trim() || null
      const passwordHash = await hashPassword(request.body.password)

      try {
        const user = await db
          .insertInto('users')
          .values({
            email: normalizedEmail,
            display_name: displayName,
            password_hash: passwordHash,
          })
          .returning(['id', 'email', 'display_name', 'created_at'])
          .executeTakeFirstOrThrow()

        return reply.status(201).send({
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            createdAt: user.created_at.toISOString(),
          },
        })
      } catch (err: unknown) {
        const pgCode =
          typeof err === 'object' && err !== null && 'code' in err
            ? (err as { code?: string }).code
            : undefined
        if (pgCode === '23505') {
          return reply.status(409).send({
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email sudah terdaftar',
            },
          })
        }
        throw err
      }
    },
  )

  app.post<{
    Body: {
      email: string
      password: string
    }
  }>(
    '/auth/login',
    {
      bodyLimit: 32 * 1024,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          additionalProperties: false,
          properties: {
            email: { type: 'string', format: 'email', maxLength: 254 },
            password: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const normalizedEmail = request.body.email.trim().toLowerCase()

      if (!emailRateLimiter.checkAndConsume(normalizedEmail)) {
        return reply.status(429).send({
          error: {
            code: 'RATE_LIMITED',
            message: 'Terlalu banyak percobaan masuk, coba lagi nanti',
          },
        })
      }

      const user = await db
        .selectFrom('users')
        .select(['id', 'email', 'display_name', 'password_hash', 'created_at'])
        .where('email', '=', normalizedEmail)
        .executeTakeFirst()

      if (!user) {
        await verifyPassword(request.body.password, DUMMY_PASSWORD_HASH)
        return reply.status(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email atau kata sandi salah',
          },
        })
      }

      const isMatch = await verifyPassword(request.body.password, user.password_hash)
      if (!isMatch) {
        return reply.status(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email atau kata sandi salah',
          },
        })
      }

      const session = await createSession(db, user.id, config.sessionTtlDays)
      reply.setCookie(
        SESSION_COOKIE_NAME,
        session.token,
        buildSessionCookieOptions(config, session.expiresAt),
      )

      return reply.status(200).send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          createdAt: user.created_at.toISOString(),
        },
      })
    },
  )

  app.post(
    '/auth/logout',
    {
      bodyLimit: 32 * 1024,
    },
    async (request, reply) => {
      const token = request.cookies?.[SESSION_COOKIE_NAME]
      if (token) {
        await deleteSessionByToken(db, token)
      }
      reply.clearCookie(SESSION_COOKIE_NAME, buildClearCookieOptions(config))
      return reply.status(200).send({ ok: true })
    },
  )

  app.get(
    '/auth/me',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const authUser = request.authUser!
      return reply.status(200).send({
        id: authUser.id,
        email: authUser.email,
        displayName: authUser.displayName,
        createdAt: authUser.createdAt.toISOString(),
      })
    },
  )

  app.delete<{
    Body: {
      password: string
    }
  }>(
    '/account',
    {
      bodyLimit: 32 * 1024,
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          required: ['password'],
          additionalProperties: false,
          properties: {
            password: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const authUser = request.authUser!
      const user = await db
        .selectFrom('users')
        .select(['id', 'password_hash'])
        .where('id', '=', authUser.id)
        .executeTakeFirst()

      if (!user) {
        reply.clearCookie(SESSION_COOKIE_NAME, buildClearCookieOptions(config))
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Sesi tidak valid',
          },
        })
      }

      const isMatch = await verifyPassword(request.body.password, user.password_hash)
      if (!isMatch) {
        return reply.status(401).send({
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Kata sandi salah',
          },
        })
      }

      await db.deleteFrom('users').where('id', '=', authUser.id).execute()
      reply.clearCookie(SESSION_COOKIE_NAME, buildClearCookieOptions(config))
      return reply.status(200).send({ ok: true })
    },
  )
}
