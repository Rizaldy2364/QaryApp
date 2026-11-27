import { describe, expect, it } from 'vitest'
import { generateSessionToken, hashSessionToken } from './session.js'

describe('session token utilities', () => {
  it('menghasilkan token acak 32 byte base64url yang unik', () => {
    const t1 = generateSessionToken()
    const t2 = generateSessionToken()

    expect(t1).not.toBe(t2)
    expect(Buffer.from(t1, 'base64url').length).toBe(32)
  })

  it('menghasilkan hash SHA-256 deterministik 64 karakter hex', () => {
    const token = generateSessionToken()
    const h1 = hashSessionToken(token)
    const h2 = hashSessionToken(token)

    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[a-f0-9]{64}$/)
    expect(h1).not.toBe(token)
  })
})
