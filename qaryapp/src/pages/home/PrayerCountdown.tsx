import { useEffect, useState } from 'react'

interface PrayerCountdownProps {
  targetDate: Date | undefined
  className?: string
}

function formatCountdown(targetDate: Date | undefined): string {
  if (!targetDate) return ''
  const diff = targetDate.getTime() - Date.now()
  if (diff <= 0) return 'Telah masuk waktu sholat'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return `${hours} jam ${minutes} menit ${seconds} detik lagi`
}

export function PrayerCountdown({ targetDate, className }: PrayerCountdownProps) {
  const [countdownText, setCountdownText] = useState(() => formatCountdown(targetDate))

  useEffect(() => {
    if (!targetDate) return

    const interval = setInterval(() => {
      setCountdownText(formatCountdown(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  const displayText = targetDate ? countdownText || formatCountdown(targetDate) : ''
  if (!displayText) return null

  return (
    <p className={className}>
      {displayText}
    </p>
  )
}
