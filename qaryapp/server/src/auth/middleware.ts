import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Kysely } from 'kysely'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/types.js'
import {
  SESSION_COOKIE_NAME,
  buildClearCookieOptions,
  buildSessionCookieOptions,
  resolveSession,
} from './session.js'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  createdAt: Date
  sessionId: string
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser
  }
}

export function createRequireAuth(db: Kysely<Database>, config: AppConfig) {
  return async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const token = request.cookies?.[SESSION_COOKIE_NAME]
    if (!token) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Silakan masuk terlebih dahulu',
        },
      })
    }

    const session = await resolveSession(db, token, config.sessionTtlDays)
    if (!session) {
      reply.clearCookie(SESSION_COOKIE_NAME, buildClearCookieOptions(config))
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sesi tidak valid atau telah berakhir',
        },
      })
    }

    if (session.shouldRefreshCookie) {
      reply.setCookie(
        SESSION_COOKIE_NAME,
        token,
        buildSessionCookieOptions(config, session.expiresAt),
      )
    }

    request.authUser = {
      id: session.userId,
      email: session.email,
      displayName: session.displayName,
      createdAt: session.createdAt,
      sessionId: session.sessionId,
    }
  }
}
