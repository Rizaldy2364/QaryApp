/**
 * Smoke test end-to-end untuk alur akun dan sinkronisasi QaryApp
 * terhadap server yang sedang berjalan.
 *
 * Penggunaan:
 *   BASE_URL=http://localhost:3000 node scripts/smoke-auth.mjs
 */

const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Smoke test gagal: ${message}`)
  }
}

class CookieJar {
  constructor() {
    this.cookies = new Map()
  }

  capture(response) {
    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : []
    for (const raw of setCookies) {
      const [pair] = raw.split(';')
      if (!pair) continue
      const eqIdx = pair.indexOf('=')
      if (eqIdx === -1) continue
      const name = pair.slice(0, eqIdx).trim()
      const value = pair.slice(eqIdx + 1).trim()
      if (value === '') {
        this.cookies.delete(name)
      } else {
        this.cookies.set(name, value)
      }
    }
  }

  header() {
    if (this.cookies.size === 0) return ''
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }
}

async function request(jar, method, path, body, extraHeaders = {}) {
  const headers = { ...extraHeaders }
  const cookieHeader = jar.header()
  if (cookieHeader) {
    headers.cookie = cookieHeader
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  if (method !== 'GET' && method !== 'HEAD' && !('x-qaryapp' in headers)) {
    headers['x-qaryapp'] = '1'
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  jar.capture(res)
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  return { status: res.status, headers: res.headers, json }
}

async function main() {
  const jar = new CookieJar()
  const email = `smoke-${Date.now()}@example.com`
  const password = 'SmokePassword123!'

  console.log(`Menjalankan smoke test ke ${baseUrl}...`)

  // 1. Health check
  const health = await request(jar, 'GET', '/api/health')
  assert(health.status === 200, `Health check diharapkan 200, dapat ${health.status}`)

  // 2. Pastikan permintaan mutasi tanpa header CSRF ditolak (403)
  const noCsrf = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' })
  assert(noCsrf.status === 403, `POST tanpa X-QaryApp diharapkan 403, dapat ${noCsrf.status}`)

  // 3. Register
  const reg = await request(jar, 'POST', '/api/auth/register', {
    email,
    password,
    displayName: 'Penguji Asap',
  })
  assert(reg.status === 201, `Register diharapkan 201, dapat ${reg.status}: ${JSON.stringify(reg.json)}`)
  assert(jar.cookies.has('qary_session'), 'Cookie qary_session harus terpasang saat register')

  // 4. Me
  const me = await request(jar, 'GET', '/api/auth/me')
  assert(me.status === 200 && me.json.email === email, 'GET /api/auth/me gagal')

  // 5. Push sinkronisasi
  const nowIso = new Date().toISOString()
  const push = await request(jar, 'POST', '/api/sync/push', {
    bookmarks: [{ surah: 2, ayah: 255, updatedAt: nowIso }],
    favorites: [{ doaId: 'doa-bangun-tidur', updatedAt: nowIso }],
    lastRead: { surah: 18, ayah: 10, updatedAt: nowIso },
  })
  assert(push.status === 200 && push.json.serverTime, 'POST /api/sync/push gagal')

  // 6. Pull sinkronisasi
  const pull = await request(jar, 'GET', '/api/sync/pull')
  assert(pull.status === 200, 'GET /api/sync/pull gagal')
  assert(pull.json.bookmarks.length === 1 && pull.json.bookmarks[0].surah === 2, 'Bookmark hasil pull tidak sesuai')
  assert(pull.json.favorites.length === 1 && pull.json.favorites[0].doaId === 'doa-bangun-tidur', 'Favorit hasil pull tidak sesuai')
  assert(pull.json.lastRead?.surah === 18 && pull.json.lastRead?.ayah === 10, 'lastRead hasil pull tidak sesuai')

  // 7. Logout
  const logout = await request(jar, 'POST', '/api/auth/logout')
  assert(logout.status === 200, 'POST /api/auth/logout gagal')
  const meAfterLogout = await request(jar, 'GET', '/api/auth/me')
  assert(meAfterLogout.status === 401, 'GET /api/auth/me setelah logout harus 401')

  // 8. Login kembali
  const login = await request(jar, 'POST', '/api/auth/login', { email, password })
  assert(login.status === 200, 'POST /api/auth/login gagal')

  // 9. Hapus akun
  const del = await request(jar, 'DELETE', '/api/account', { password })
  assert(del.status === 200, 'DELETE /api/account gagal')
  const meAfterDelete = await request(jar, 'GET', '/api/auth/me')
  assert(meAfterDelete.status === 401, 'GET /api/auth/me setelah hapus akun harus 401')

  console.log('✓ Seluruh alur smoke test (register, me, push, pull, logout, login, delete account) LULUS.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
