import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('gagal jelas bila DATABASE_URL tidak ada', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/)
  })

  it('memakai nilai bawaan yang benar bila env opsional kosong', () => {
    const cfg = loadConfig({
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/qaryapp',
    })
    expect(cfg.port).toBe(3000)
    expect(cfg.nodeEnv).toBe('development')
    expect(cfg.sessionTtlDays).toBe(30)
    expect(cfg.trustProxy).toBe(false)
    expect(cfg.allowedOrigins).toEqual([])
  })

  it('memvalidasi angka PORT dan NODE_ENV tidak valid', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: 'postgres://localhost/db',
        PORT: '99999',
      }),
    ).toThrow(/PORT/)

    expect(() =>
      loadConfig({
        DATABASE_URL: 'postgres://localhost/db',
        NODE_ENV: 'staging',
      }),
    ).toThrow(/NODE_ENV/)
  })
})
