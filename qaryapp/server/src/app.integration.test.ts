import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createDb } from './db/index.js'
import { createMigrator } from './db/migrate.js'

const testDbUrl = process.env.TEST_DATABASE_URL?.trim()
const describeWithDb = testDbUrl ? describe : describe.skip

describeWithDb('integrasi API akun dan sinkronisasi (app.inject)', () => {
  let app: FastifyInstance
  let cleanupDb: () => Promise<void>

  beforeAll(async () => {
    const config = loadConfig({
      DATABASE_URL: testDbUrl!,
      NODE_ENV: 'test',
      PORT: '3000',
      SESSION_TTL_DAYS: '30',
      TRUST_PROXY: 'false',
    })
    const { db } = createDb(config.databaseUrl)
    const migrator = createMigrator(db)
    const { error } = await migrator.migrateToLatest()
    if (error) throw error

    app = await buildApp({ config, db, logger: false })
    cleanupDb = async () => {
      await app.close()
      await db.destroy()
    }
  })

  afterAll(async () => {
    if (cleanupDb) {
      await cleanupDb()
    }
  })

  it('menjalankan alur register, me, push, pull, logout, login, dan hapus akun', async () => {
    const email = `uji-${Date.now()}@example.com`
    const password = 'PasswordAman123!'

    // CSRF ditolak tanpa X-QaryApp
    const csrfFail = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password },
    })
    expect(csrfFail.statusCode).toBe(403)

    // Register (tidak langsung membuat sesi login)
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { 'x-qaryapp': '1' },
      payload: { email, password, displayName: 'Fulan' },
    })
    expect(reg.statusCode).toBe(201)
    expect(reg.cookies.find((c) => c.name === 'qary_session')).toBeUndefined()

    // Login pertama setelah register
    const firstLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-qaryapp': '1' },
      payload: { email, password },
    })
    expect(firstLogin.statusCode).toBe(200)
    const sessionCookie = firstLogin.cookies.find((c) => c.name === 'qary_session')
    expect(sessionCookie?.value).toBeTruthy()
    expect(sessionCookie?.httpOnly).toBe(true)

    const cookieHeader = `qary_session=${sessionCookie!.value}`

    // Email duplikat -> 409
    const dup = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { 'x-qaryapp': '1' },
      payload: { email, password },
    })
    expect(dup.statusCode).toBe(409)
    expect(dup.json().error.message).toBe('Email sudah terdaftar')

    // GET /api/auth/me
    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookieHeader },
    })
    expect(me.statusCode).toBe(200)
    expect(me.json().email).toBe(email)

    // Push & Pull
    const nowIso = new Date().toISOString()
    const push = await app.inject({
      method: 'POST',
      url: '/api/sync/push',
      headers: { 'x-qaryapp': '1', cookie: cookieHeader },
      payload: {
        bookmarks: [{ surah: 1, ayah: 1, updatedAt: nowIso }],
        favorites: [{ doaId: 'doa-tidur', updatedAt: nowIso }],
        lastRead: { surah: 2, ayah: 5, updatedAt: nowIso },
      },
    })
    expect(push.statusCode).toBe(200)

    const pull = await app.inject({
      method: 'GET',
      url: '/api/sync/pull',
      headers: { cookie: cookieHeader },
    })
    expect(pull.statusCode).toBe(200)
    expect(pull.json().bookmarks).toHaveLength(1)
    expect(pull.json().favorites).toHaveLength(1)
    expect(pull.json().lastRead?.surah).toBe(2)

    // Logout
    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { 'x-qaryapp': '1', cookie: cookieHeader },
    })
    expect(logout.statusCode).toBe(200)

    // Me setelah logout -> 401
    const meAfterLogout = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookieHeader },
    })
    expect(meAfterLogout.statusCode).toBe(401)

    // Login kembali
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-qaryapp': '1' },
      payload: { email, password },
    })
    expect(login.statusCode).toBe(200)
    const loginCookie = login.cookies.find((c) => c.name === 'qary_session')
    expect(loginCookie?.value).toBeTruthy()

    // Delete account
    const del = await app.inject({
      method: 'DELETE',
      url: '/api/account',
      headers: {
        'x-qaryapp': '1',
        cookie: `qary_session=${loginCookie!.value}`,
      },
      payload: { password },
    })
    expect(del.statusCode).toBe(200)
  })
})
