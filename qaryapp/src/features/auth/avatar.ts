const AVATAR_STORAGE_PREFIX = 'qaryapp_profile_avatar:'

export function getAvatarInitials(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmedName = displayName?.trim()
  if (trimmedName) {
    const words = trimmedName.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase()
    }
    return trimmedName.slice(0, 2).toUpperCase()
  }

  const trimmedEmail = email?.trim()
  if (trimmedEmail) {
    const localPart = trimmedEmail.split('@')[0] || trimmedEmail
    return localPart.slice(0, 2).toUpperCase()
  }

  return 'QA'
}

export function getProfileAvatar(userId: string): string | null {
  try {
    const value = window.localStorage.getItem(`${AVATAR_STORAGE_PREFIX}${userId}`)
    return value && value.startsWith('data:image/') ? value : null
  } catch {
    return null
  }
}

export function saveProfileAvatar(userId: string, dataUrl: string): boolean {
  try {
    window.localStorage.setItem(`${AVATAR_STORAGE_PREFIX}${userId}`, dataUrl)
    return true
  } catch {
    return false
  }
}

export function removeProfileAvatar(userId: string): void {
  try {
    window.localStorage.removeItem(`${AVATAR_STORAGE_PREFIX}${userId}`)
  } catch {
    // Abaikan jika penyimpanan dibatasi
  }
}

/**
 * Memotong tengah dan mengecilkan gambar pilihan pengguna ke ukuran persegi
 * agar ringan disimpan di perangkat.
 */
export function resizeAvatarImage(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Pilih file gambar yang valid (JPG, PNG, atau WebP)'))
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Gagal memproses gambar'))
          return
        }

        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)

        const webpUrl = canvas.toDataURL('image/webp', 0.85)
        if (webpUrl.startsWith('data:image/webp')) {
          resolve(webpUrl)
          return
        }
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        reject(new Error('Gagal memproses gambar'))
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Gambar tidak dapat dibaca'))
    }

    img.src = objectUrl
  })
}
