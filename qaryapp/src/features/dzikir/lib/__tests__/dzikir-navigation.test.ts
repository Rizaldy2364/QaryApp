// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDzikirProgress,
  saveDzikirProgress,
} from '../../../../lib/storage'
import type { DzikirProgress } from '../../../../types'

describe('Dzikir Previous Navigation Logic & Progress Retention', () => {
  const dateStr = '2026-11-24'
  const period = 'morning' as const

  beforeEach(() => {
    localStorage.clear()
  })

  it('memastikan kemajuan hitungan dan completedIds tidak hilang saat navigasi mundur', () => {
    // Skenario: Pengguna telah menyelesaikan dzikir-1 (count: 3) dan sedang di dzikir-2 (count: 1)
    const initialCounts = {
      '1': 3,
      '2': 1,
    }
    const initialCompleted = [1]
    const currentIdx = 1

    const progressEntry: DzikirProgress = {
      date: dateStr,
      period,
      currentIndex: currentIdx,
      counts: initialCounts,
      completedIds: initialCompleted,
      updatedAt: new Date().toISOString(),
    }

    saveDzikirProgress(progressEntry)

    // Verifikasi tersimpan
    let progress = getDzikirProgress(dateStr, period)
    expect(progress).not.toBeNull()
    expect(progress?.currentIndex).toBe(1)
    expect(progress?.counts['1']).toBe(3)
    expect(progress?.counts['2']).toBe(1)
    expect(progress?.completedIds).toEqual([1])

    // Pengguna menekan tombol "Sebelumnya" (mundur ke index 0)
    const prevIdx = currentIdx - 1
    const updatedEntry: DzikirProgress = {
      ...progress!,
      currentIndex: prevIdx,
      updatedAt: new Date().toISOString(),
    }
    saveDzikirProgress(updatedEntry)

    // Verifikasi setelah navigasi mundur
    progress = getDzikirProgress(dateStr, period)
    expect(progress).not.toBeNull()
    expect(progress?.currentIndex).toBe(0)
    // Hitungan dan status selesai dari dzikir sebelumnya dan sesudahnya harus tetap utuh!
    expect(progress?.counts['1']).toBe(3)
    expect(progress?.counts['2']).toBe(1)
    expect(progress?.completedIds).toContain(1)
  })
})
