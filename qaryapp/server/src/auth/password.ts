import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

export const SCRYPT_PARAMS = {
  N: 32768, // 2^15 — aman untuk server kecil (~32 MiB/operasi) sesuai batas memori OWASP
  r: 8,
  p: 1,
  keylen: 64,
  maxmem: 64 * 1024 * 1024,
} as const

const SALT_BYTES = 16

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) {
        reject(err)
        return
      }
      resolve(derivedKey)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scryptAsync(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: SCRYPT_PARAMS.maxmem,
  })
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false
  }

  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const saltStr = parts[4]
  const hashStr = parts[5]

  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N < 16384 ||
    N > 131072 ||
    r < 1 ||
    r > 16 ||
    p < 1 ||
    p > 8 ||
    !saltStr ||
    !hashStr
  ) {
    return false
  }

  const salt = Buffer.from(saltStr, 'base64url')
  const expected = Buffer.from(hashStr, 'base64url')
  if (salt.length < 8 || expected.length < 16) {
    return false
  }

  const derived = await scryptAsync(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: Math.max(SCRYPT_PARAMS.maxmem, 128 * N * r * 2),
  })

  if (derived.length !== expected.length) {
    return false
  }

  return timingSafeEqual(derived, expected)
}

// Hash tiruan valid untuk menyamakan waktu respons ketika email tidak ditemukan saat login
export const DUMMY_PASSWORD_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
