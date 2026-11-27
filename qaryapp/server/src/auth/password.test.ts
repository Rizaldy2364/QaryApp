import { describe, expect, it } from 'vitest'
import {
  DUMMY_PASSWORD_HASH,
  SCRYPT_PARAMS,
  hashPassword,
  verifyPassword,
} from './password.js'

describe('password hashing (scrypt)', () => {
  it('menghasilkan format scrypt$N$r$p$salt$hash dengan garam acak', async () => {
    const h1 = await hashPassword('Rahasia123!')
    const h2 = await hashPassword('Rahasia123!')

    const parts = h1.split('$')
    expect(parts).toHaveLength(6)
    expect(parts[0]).toBe('scrypt')
    expect(Number(parts[1])).toBe(SCRYPT_PARAMS.N)
    expect(Number(parts[2])).toBe(SCRYPT_PARAMS.r)
    expect(Number(parts[3])).toBe(SCRYPT_PARAMS.p)
    expect(h1).not.toBe(h2)
  })

  it('memverifikasi kata sandi benar dan menolak yang salah', async () => {
    const hash = await hashPassword('KataSandiKuat99')
    expect(await verifyPassword('KataSandiKuat99', hash)).toBe(true)
    expect(await verifyPassword('KataSandiSalah', hash)).toBe(false)
  })

  it('menolak format hash rusak dan tetap aman memverifikasi DUMMY_PASSWORD_HASH', async () => {
    expect(await verifyPassword('abc12345', 'invalid-format')).toBe(false)
    expect(await verifyPassword('abc12345', 'scrypt$100$8$1$abc$def')).toBe(false)
    expect(await verifyPassword('abc12345', DUMMY_PASSWORD_HASH)).toBe(false)
  })
})
