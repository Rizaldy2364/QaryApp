import { describe, expect, it } from 'vitest'
import { validateCsrfRequest } from './csrf.js'

describe('validateCsrfRequest', () => {
  it('mengizinkan GET dan HEAD tanpa header CSRF', () => {
    expect(
      validateCsrfRequest({
        method: 'GET',
        csrfHeader: undefined,
        originHeader: undefined,
        hostHeader: 'localhost:3000',
        protocol: 'http',
        allowedOrigins: [],
      }),
    ).toEqual({ ok: true })

    expect(
      validateCsrfRequest({
        method: 'HEAD',
        csrfHeader: undefined,
        originHeader: undefined,
        hostHeader: 'localhost:3000',
        protocol: 'http',
        allowedOrigins: [],
      }),
    ).toEqual({ ok: true })
  })

  it('menolak POST/DELETE tanpa header X-QaryApp: 1', () => {
    const res = validateCsrfRequest({
      method: 'POST',
      csrfHeader: undefined,
      originHeader: 'http://localhost:3000',
      hostHeader: 'localhost:3000',
      protocol: 'http',
      allowedOrigins: [],
    })
    expect(res.ok).toBe(false)
  })

  it('menolak Origin yang tidak cocok dengan host maupun allowedOrigins', () => {
    const res = validateCsrfRequest({
      method: 'POST',
      csrfHeader: '1',
      originHeader: 'https://evil.example',
      hostHeader: 'localhost:3000',
      protocol: 'http',
      allowedOrigins: ['http://localhost:5173'],
    })
    expect(res.ok).toBe(false)
  })

  it('mengizinkan mutasi dengan X-QaryApp: 1 dan origin sama atau diizinkan', () => {
    expect(
      validateCsrfRequest({
        method: 'POST',
        csrfHeader: '1',
        originHeader: 'http://localhost:5173',
        hostHeader: 'localhost:3000',
        protocol: 'http',
        allowedOrigins: ['http://localhost:5173'],
      }),
    ).toEqual({ ok: true })

    expect(
      validateCsrfRequest({
        method: 'DELETE',
        csrfHeader: '1',
        originHeader: 'https://qaryapp.id',
        hostHeader: 'qaryapp.id',
        protocol: 'https',
        allowedOrigins: [],
      }),
    ).toEqual({ ok: true })
  })

  it('mengizinkan origin LAN saat development dan header x-forwarded-host dari proxy', () => {
    expect(
      validateCsrfRequest({
        method: 'POST',
        csrfHeader: '1',
        originHeader: 'http://192.168.1.12:5173',
        hostHeader: '127.0.0.1:3000',
        protocol: 'http',
        allowedOrigins: ['http://localhost:5173'],
        isDev: true,
      }),
    ).toEqual({ ok: true })

    expect(
      validateCsrfRequest({
        method: 'DELETE',
        csrfHeader: '1',
        originHeader: 'https://demo.trycloudflare.com',
        hostHeader: '127.0.0.1:3000',
        forwardedHostHeader: 'demo.trycloudflare.com',
        forwardedProtoHeader: 'https',
        protocol: 'http',
        allowedOrigins: [],
      }),
    ).toEqual({ ok: true })
  })
})
