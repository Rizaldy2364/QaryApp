export const ADZAN_AUDIO_PATH = '/audio/adzan.mp3'

let cachedAvailability: boolean | null = null

/**
 * Memeriksa ketersediaan berkas adzan lokal tanpa melempar galat ke aplikasi.
 */
export async function checkAdzanAvailable(forceRecheck = false): Promise<boolean> {
  if (!forceRecheck && cachedAvailability !== null) {
    return cachedAvailability
  }

  if (typeof fetch !== 'function') {
    cachedAvailability = false
    return false
  }

  try {
    const res = await fetch(ADZAN_AUDIO_PATH, { method: 'HEAD' })
    const contentType = res.headers.get('content-type') ?? ''
    // Pastikan respons benar-benar audio (bukan fallback index.html SPA)
    const isAudio = res.ok && !contentType.includes('text/html')
    cachedAvailability = isAudio
    return isAudio
  } catch {
    cachedAvailability = false
    return false
  }
}

export function resetAdzanAvailabilityCache(): void {
  cachedAvailability = null
}
