// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import {
  getAvatarInitials,
  getProfileAvatar,
  removeProfileAvatar,
  saveProfileAvatar,
} from '../avatar'

describe('getAvatarInitials', () => {
  it('mengambil dua huruf awal dari nama tampilan multi-kata', () => {
    expect(getAvatarInitials('Ahmad Fauzi', 'ahmad@example.com')).toBe('AF')
  })

  it('mengambil dua huruf pertama dari nama satu kata', () => {
    expect(getAvatarInitials('Zaid', 'zaid@example.com')).toBe('ZA')
  })

  it('jatuh ke email bila nama kosong atau hanya spasi', () => {
    expect(getAvatarInitials('', 'budi@example.com')).toBe('BU')
    expect(getAvatarInitials('   ', 'siti@example.com')).toBe('SI')
    expect(getAvatarInitials(null, 'nur@example.com')).toBe('NU')
  })

  it('mengembalikan QA bila nama dan email tidak tersedia', () => {
    expect(getAvatarInitials(null, null)).toBe('QA')
  })
})

describe('penyimpanan foto profil lokal', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('menyimpan, membaca, dan menghapus data URL foto profil per pengguna', () => {
    const dataUrl = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4'
    expect(getProfileAvatar('user-1')).toBeNull()
    expect(saveProfileAvatar('user-1', dataUrl)).toBe(true)
    expect(getProfileAvatar('user-1')).toBe(dataUrl)
    expect(getProfileAvatar('user-2')).toBeNull()

    removeProfileAvatar('user-1')
    expect(getProfileAvatar('user-1')).toBeNull()
  })

  it('mengabaikan nilai yang bukan data:image/', () => {
    window.localStorage.setItem('qaryapp_profile_avatar:user-1', 'https://example.com/a.png')
    expect(getProfileAvatar('user-1')).toBeNull()
  })
})
