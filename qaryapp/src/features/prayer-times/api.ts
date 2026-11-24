import { fetchWithTimeout } from '../../lib/http'
import type { AladhanCalendarResponse, AladhanDayData } from './types'

export async function fetchMonthlyCalendar(
  latitude: number,
  longitude: number,
  year: number,
  month: number,
  methodId?: number,
  signal?: AbortSignal,
): Promise<AladhanDayData[]> {
  const methodParam = typeof methodId === 'number' ? `&method=${methodId}` : ''
  const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}${methodParam}`

  const response = await fetchWithTimeout<AladhanCalendarResponse>(url, {
    signal,
    timeoutMs: 12000,
  })

  if (response.code !== 200 || !Array.isArray(response.data)) {
    throw new Error('Gagal mengambil kalender jadwal sholat dari server.')
  }

  return response.data
}
