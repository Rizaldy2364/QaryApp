import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ayah } from './types'

export interface AyahPlayerState {
  playingAyahNumber: number | null
  isPlaying: boolean
  isLoading: boolean
  error: string | null
}

export interface UseAyahPlayerOptions {
  ayahs?: Ayah[]
  onAyahChange?: (ayahNumber: number) => void
}

export function useAyahPlayer(options?: UseAyahPlayerOptions) {
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentUrlRef = useRef<string>('')
  const optionsRef = useRef(options)
  const ayahsRef = useRef(options?.ayahs)

  useEffect(() => {
    optionsRef.current = options
    ayahsRef.current = options?.ayahs
  })

  // Inisialisasi audio element sekali
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handlePlaying = () => {
      setIsLoading(false)
      setIsPlaying(true)
      setError(null)
    }
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setIsLoading(false)
      setPlayingAyahNumber((current) => {
        if (current === null) return null
        const list = ayahsRef.current
        if (list && list.length > 0) {
          const nextIndex = list.findIndex((a) => a.number === current + 1)
          if (nextIndex !== -1) {
            const nextAyah = list[nextIndex]
            if (nextAyah.audioUrl) {
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.src = nextAyah.audioUrl
                  currentUrlRef.current = nextAyah.audioUrl
                  setPlayingAyahNumber(nextAyah.number)
                  setIsLoading(true)
                  audioRef.current.play().catch(() => {
                    setIsLoading(false)
                    setIsPlaying(false)
                  })
                  optionsRef.current?.onAyahChange?.(nextAyah.number)
                }
              }, 150)
              return nextAyah.number
            }
          }
        }
        return current
      })
    }
    const handleError = () => {
      setIsLoading(false)
      setIsPlaying(false)
      setError('Gagal memutar audio ayat')
    }

    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  const playAyah = useCallback(async (ayahNumber: number, audioUrl: string) => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    setError(null)

    // Jika sedang memainkan ayat yang sama
    if (playingAyahNumber === ayahNumber && currentUrlRef.current === audioUrl) {
      if (audio.paused) {
        try {
          await audio.play()
        } catch {
          setError('Gagal melanjutkan audio')
        }
      }
      return
    }

    // Ganti track ayat baru
    setPlayingAyahNumber(ayahNumber)
    setIsLoading(true)
    currentUrlRef.current = audioUrl
    audio.src = audioUrl

    try {
      await audio.play()
    } catch {
      setIsLoading(false)
      setIsPlaying(false)
      setError('Gagal memutar audio ayat')
    }
  }, [playingAyahNumber])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
    }
  }, [])

  const resume = useCallback(async () => {
    const audio = audioRef.current
    if (audio && audio.paused && audio.src) {
      try {
        await audio.play()
      } catch {
        setError('Gagal melanjutkan audio')
      }
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setPlayingAyahNumber(null)
    setIsPlaying(false)
    setIsLoading(false)
  }, [])

  const toggle = useCallback((ayahNumber: number, audioUrl: string) => {
    if (playingAyahNumber === ayahNumber) {
      if (isPlaying) {
        pause()
      } else {
        resume()
      }
    } else {
      playAyah(ayahNumber, audioUrl)
    }
  }, [playingAyahNumber, isPlaying, pause, resume, playAyah])

  return {
    playingAyahNumber,
    isPlaying,
    isLoading,
    error,
    playAyah,
    pause,
    resume,
    stop,
    toggle,
  }
}
