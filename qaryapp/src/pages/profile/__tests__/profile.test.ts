// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSettings,
  updateSettings,
  SETTINGS_STORAGE_KEY,
} from '../../../lib/storage'
import type { AppSettings } from '../../../types'

describe('Pengaturan Tema dan Ukuran Teks Arab di Profil', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('memperbarui tema dan menyimpannya di localStorage', () => {
    const updated = updateSettings({ theme: 'dark' })
    expect(updated.theme).toBe('dark')

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as AppSettings
    expect(parsed.theme).toBe('dark')

    const reloaded = getSettings()
    expect(reloaded.theme).toBe('dark')
  })

  it('memperbarui ukuran teks Arab dan menyimpannya di localStorage', () => {
    const updated = updateSettings({ arabSize: 'large' })
    expect(updated.arabSize).toBe('large')

    const reloaded = getSettings()
    expect(reloaded.arabSize).toBe('large')
  })

  it('memastikan pengaturan bawaan saat penyimpanan kosong', () => {
    const initial = getSettings()
    expect(initial.theme).toBe('system')
    expect(initial.arabSize).toBe('medium')
    expect(initial.location).toBeNull()
  })
})
