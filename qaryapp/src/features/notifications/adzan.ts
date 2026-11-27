export const ADZAN_AUDIO_PATH = '/audio/adzan.mp3'

let cachedAvailability: boolean | null = null

/**
 * Memeriksa ketersediaan berkas adzan MP3 lokal tanpa melempar galat ke aplikasi.
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

export interface AdzanPlaybackHandle {
  stop: () => void
}

/**
 * Memainkan nada pengingat adzan harmonik via Web Audio API sebagai cadangan
 * ketika berkas /audio/adzan.mp3 tidak tersedia.
 */
async function playSynthesizedAdzanChime(onEnded: () => void): Promise<AdzanPlaybackHandle> {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) {
    throw new Error('Web Audio API tidak didukung')
  }

  const ctx = new AudioCtx()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  // Rangkaian nada pentatonik lembut pengingat masuk waktu sholat
  const notes = [
    { freq: 440.0, start: 0.0, dur: 0.7 }, // A4
    { freq: 493.88, start: 0.65, dur: 0.65 }, // B4
    { freq: 587.33, start: 1.25, dur: 1.0 }, // D5
    { freq: 523.25, start: 2.3, dur: 0.65 }, // C5
    { freq: 493.88, start: 2.95, dur: 0.7 }, // B4
    { freq: 440.0, start: 3.65, dur: 1.3 }, // A4
  ]

  const master = ctx.createGain()
  master.gain.value = 0.25
  master.connect(ctx.destination)

  let stopped = false
  const oscillators: OscillatorNode[] = []

  for (const n of notes) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start)

    env.gain.setValueAtTime(0.0001, ctx.currentTime + n.start)
    env.gain.exponentialRampToValueAtTime(1, ctx.currentTime + n.start + 0.08)
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.start + n.dur)

    osc.connect(env)
    env.connect(master)
    osc.start(ctx.currentTime + n.start)
    osc.stop(ctx.currentTime + n.start + n.dur + 0.05)
    oscillators.push(osc)
  }

  const finishTimer = window.setTimeout(() => {
    if (!stopped) {
      stopped = true
      void ctx.close().catch(() => {})
      onEnded()
    }
  }, 5200)

  return {
    stop: () => {
      if (stopped) return
      stopped = true
      window.clearTimeout(finishTimer)
      for (const osc of oscillators) {
        try {
          osc.stop()
        } catch {
          // Abaikan jika sudah berhenti
        }
      }
      void ctx.close().catch(() => {})
    },
  }
}

/**
 * Memutar suara adzan: memprioritaskan /audio/adzan.mp3 jika tersedia,
 * atau memakai nada pengingat adzan bawaan via Web Audio API.
 */
export async function startAdzanSound(onEnded: () => void): Promise<AdzanPlaybackHandle> {
  const hasFile = await checkAdzanAvailable()
  if (hasFile) {
    const audio = new Audio(ADZAN_AUDIO_PATH)
    audio.preload = 'auto'
    const handleEnded = () => onEnded()
    audio.addEventListener('ended', handleEnded, { once: true })
    audio.addEventListener('error', handleEnded, { once: true })

    await audio.play()
    return {
      stop: () => {
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleEnded)
        try {
          audio.pause()
          audio.currentTime = 0
        } catch {
          // Abaikan galat jeda
        }
      },
    }
  }

  return playSynthesizedAdzanChime(onEnded)
}
