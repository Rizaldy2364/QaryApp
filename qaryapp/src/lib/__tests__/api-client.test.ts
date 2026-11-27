import { describe, expect, it } from 'vitest'
import { ApiError, normalizeApiError } from '../api-client'

describe('normalizeApiError', () => {
  it('memetakan bentuk { error: { code, message } } dari server', () => {
    const err = normalizeApiError(409, {
      error: {
        code: 'EMAIL_EXISTS',
        message: 'Email sudah terdaftar',
      },
    })

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.code).toBe('EMAIL_EXISTS')
    expect(err.message).toBe('Email sudah terdaftar')
  })

  it('memberikan pesan bawaan bahasa Indonesia untuk 401, 429, 500+, dan status lain', () => {
    const err401 = normalizeApiError(401, null)
    expect(err401.code).toBe('UNAUTHORIZED')
    expect(err401.message).toContain('berakhir')

    const err429 = normalizeApiError(429, {})
    expect(err429.code).toBe('RATE_LIMITED')

    const err500 = normalizeApiError(500, null)
    expect(err500.code).toBe('SERVER_UNAVAILABLE')
    expect(err500.message).toContain('Server belum aktif')

    const err400 = normalizeApiError(400, 'raw html error', 'Permintaan gagal')
    expect(err400.code).toBe('API_ERROR')
    expect(err400.message).toBe('Permintaan gagal')
  })
})
