import { createHash, randomBytes } from 'node:crypto'
import type { CookieSerializeOptions } from '@fastify/cookie'
import type { Kysely } from 'kysely'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/types.js'

export const SESSION_COOKIE_NAME = 'qary_session'
const TOKEN_BYTES = 32
const SLIDING_REFRESH_MS = 24 * 60 * 60 * 1000

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildSessionCookieOptions(
  config: AppConfig,
  expiresAt: Date,
): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
    expires: expiresAt,
  }
}

export function buildClearCookieOptions(config: AppConfig): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  }
}

export async function createSession(
  db: Kysely<Database>,
  userId: string,
  ttlDays: number,
): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  const token = generateSessionToken()
  const tokenHash = hashSessionToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)

  const row = await db
    .insertInto('sessions')
    .values({
      user_id: userId,
      token_hash: tokenHash,
      created_at: now,
      last_used_at: now,
      expires_at: expiresAt,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow()

  return {
    token,
    sessionId: row.id,
    expiresAt,
  }
}

export interface ResolvedSession {
  sessionId: string
  userId: string
  email: string
  displayName: string | null
  createdAt: Date
  shouldRefreshCookie: boolean
  expiresAt: Date
}

export async function resolveSession(
  db: Kysely<Database>,
  token: string,
  ttlDays: number,
): Promise<ResolvedSession | null> {
  if (!token || token.length < 20 || token.length > 256) {
    return null
  }

  const tokenHash = hashSessionToken(token)
  const row = await db
    .selectFrom('sessions')
    .innerJoin('users', 'users.id', 'sessions.user_id')
    .select([
      'sessions.id as session_id',
      'sessions.user_id as user_id',
      'sessions.last_used_at as last_used_at',
      'sessions.expires_at as expires_at',
      'users.email as email',
      'users.display_name as display_name',
      'users.created_at as user_created_at',
    ])
    .where('sessions.token_hash', '=', tokenHash)
    .executeTakeFirst()

  if (!row) {
    return null
  }

  const now = new Date()
  if (row.expires_at.getTime() <= now.getTime()) {
    await db.deleteFrom('sessions').where('id', '=', row.session_id).execute()
    return null
  }

  let shouldRefreshCookie = false
  let expiresAt = row.expires_at

  if (now.getTime() - row.last_used_at.getTime() > SLIDING_REFRESH_MS) {
    expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)
    await db
      .updateTable('sessions')
      .set({
        last_used_at: now,
        expires_at: expiresAt,
      })
      .where('id', '=', row.session_id)
      .execute()
    shouldRefreshCookie = true
  }

  return {
    sessionId: row.session_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.user_created_at,
    shouldRefreshCookie,
    expiresAt,
  }
}

export async function deleteSessionByToken(
  db: Kysely<Database>,
  token: string,
): Promise<void> {
  if (!token) return
  const tokenHash = hashSessionToken(token)
  await db.deleteFrom('sessions').where('token_hash', '=', tokenHash).execute()
}
