// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  computeHeadingFromQuaternion,
  computeTiltCompensatedHeading,
  extractHeadingFromEvent,
  smoothCircularHeading,
  useQiblaCompass,
} from '../useQiblaCompass'
import { KAABA_COORDS, computeGeodesicPoints } from '../lib/qibla'

describe('computeHeadingFromQuaternion', () => {
  it('menghitung arah Utara, Timur, Selatan, dan Barat saat ponsel datar', () => {
    const s45 = Math.SQRT1_2
    // Identitas -> menghadap Utara (0°)
    expect(Math.round(computeHeadingFromQuaternion([0, 0, 0, 1], 0))).toBe(0)
    // Rotasi -90° terhadap Z -> menghadap Timur (90°)
    expect(Math.round(computeHeadingFromQuaternion([0, 0, -s45, s45], 0))).toBe(90)
    // Rotasi 180° terhadap Z -> menghadap Selatan (180°)
    expect(Math.round(computeHeadingFromQuaternion([0, 0, 1, 0], 0))).toBe(180)
    // Rotasi +90° terhadap Z -> menghadap Barat (270°)
    expect(Math.round(computeHeadingFromQuaternion([0, 0, s45, s45], 0))).toBe(270)
  })

  it('tetap akurat saat ponsel diangkat tegak menghadap Utara, Timur, Selatan, dan Barat (proyeksi -Z)', () => {
    const s45 = Math.SQRT1_2
    // Ponsel diangkat tegak 90° menghadap Utara (rotasi +90° sumbu X)
    expect(Math.round(computeHeadingFromQuaternion([s45, 0, 0, s45], 0))).toBe(0)

    // Ponsel diangkat tegak 90° lalu diputar menghadap Timur: Rz(-90°) * Rx(+90°)
    expect(Math.round(computeHeadingFromQuaternion([0.5, -0.5, -0.5, 0.5], 0))).toBe(90)

    // Ponsel diangkat tegak 90° lalu diputar menghadap Selatan: Rz(180°) * Rx(+90°)
    expect(Math.round(computeHeadingFromQuaternion([0, s45, s45, 0], 0))).toBe(180)

    // Ponsel diangkat tegak 90° lalu diputar menghadap Barat: Rz(+90°) * Rx(+90°)
    expect(Math.round(computeHeadingFromQuaternion([0.5, 0.5, 0.5, 0.5], 0))).toBe(270)
  })
})

describe('computeTiltCompensatedHeading', () => {
  it('mengonversi alpha W3C (counter-clockwise) ke kompas searah jarum jam saat ponsel datar', () => {
    expect(computeTiltCompensatedHeading(0, 0, 0, 0)).toBe(0)
    expect(computeTiltCompensatedHeading(90, 0, 0, 0)).toBe(270)
    expect(computeTiltCompensatedHeading(180, 0, 0, 0)).toBe(180)
    expect(computeTiltCompensatedHeading(270, 0, 0, 0)).toBe(90)
  })

  it('menghitung heading tanpa lonjakan saat ponsel dimiringkan 45° atau tegak 80°', () => {
    expect(Math.round(computeTiltCompensatedHeading(90, 45, 0, 0))).toBe(270)
    const tilted = computeTiltCompensatedHeading(90, 45, 15, 0)
    expect(tilted).toBeGreaterThan(240)
    expect(tilted).toBeLessThan(280)
    expect(Math.round(computeTiltCompensatedHeading(90, 80, 0, 0))).toBe(270)
    expect(Math.round(computeTiltCompensatedHeading(0, 80, 0, 0))).toBe(0)
  })
})

describe('extractHeadingFromEvent', () => {
  it('memprioritaskan webkitCompassHeading pada iOS tanpa menggeser ganda dengan screenAngle', () => {
    const fakeIosEvent = {
      webkitCompassHeading: 120,
      webkitCompassAccuracy: 10,
      alpha: 200,
      beta: 0,
      gamma: 0,
      absolute: false,
    } as unknown as DeviceOrientationEvent

    const res = extractHeadingFromEvent(fakeIosEvent, false, 90)
    expect(res.rawHeading).toBe(120)
    expect(res.isAbsolute).toBe(true)
    expect(res.iosAccuracy).toBe(10)
  })

  it('mengabaikan webkitCompassHeading negatif dan jatuh ke alpha bila tersedia', () => {
    const fakeEvent = {
      webkitCompassHeading: -1,
      alpha: 90,
      beta: 0,
      gamma: 0,
      absolute: true,
    } as unknown as DeviceOrientationEvent

    const res = extractHeadingFromEvent(fakeEvent, false, 0)
    expect(res.rawHeading).toBe(270)
    expect(res.isAbsolute).toBe(true)
  })

  it('menandai sumber absolut hanya jika listener absolut atau event.absolute === true dan alpha valid', () => {
    const relativeEvent = {
      alpha: 90,
      beta: 0,
      gamma: 0,
      absolute: false,
    } as unknown as DeviceOrientationEvent

    expect(extractHeadingFromEvent(relativeEvent, false, 0).isAbsolute).toBe(false)
    expect(extractHeadingFromEvent(relativeEvent, true, 0).isAbsolute).toBe(true)

    const nullAlphaEvent = {
      alpha: null,
      beta: 0,
      gamma: 0,
      absolute: true,
    } as unknown as DeviceOrientationEvent

    expect(extractHeadingFromEvent(nullAlphaEvent, true, 0)).toEqual({
      rawHeading: null,
      isAbsolute: false,
      iosAccuracy: null,
    })
  })
})

describe('smoothCircularHeading', () => {
  it('melewati batas 359° -> 1° melalui jalur terpendek', () => {
    const smoothed = smoothCircularHeading(359, 1)
    expect(smoothed).toBeGreaterThan(359)
    expect(smoothed).toBeLessThan(360)
  })

  it('merespons cepat saat perubahan sudut besar (> 45°)', () => {
    const smoothed = smoothCircularHeading(0, 90)
    expect(smoothed).toBeGreaterThan(60)
  })
})

describe('useQiblaCompass auto-upgrade & anti-overwrite', () => {
  it('langsung upgrade dari relatif ke absolut dan mengabaikan event relatif berikutnya', () => {
    const { result, unmount } = renderHook(() => useQiblaCompass())

    // 1. Event relatif masuk lebih dulu -> status sementara relative
    act(() => {
      const relEvent = new Event('deviceorientation') as DeviceOrientationEvent & {
        alpha: number
        beta: number
        gamma: number
        absolute: boolean
      }
      relEvent.alpha = 180
      relEvent.beta = 0
      relEvent.gamma = 0
      relEvent.absolute = false
      window.dispatchEvent(relEvent)
    })

    expect(result.current.accuracySource).toBe('relative')
    expect(result.current.heading).toBe(180)

    // 2. Event deviceorientationabsolute masuk langsung setelahnya (<40ms) -> wajib upgrade
    act(() => {
      const absEvent = new Event('deviceorientationabsolute') as DeviceOrientationEvent & {
        alpha: number
        beta: number
        gamma: number
        absolute: boolean
      }
      absEvent.alpha = 270 // heading kompas = 90°
      absEvent.beta = 0
      absEvent.gamma = 0
      absEvent.absolute = true
      window.dispatchEvent(absEvent)
    })

    expect(result.current.accuracySource).toBe('absolute')
    expect(result.current.heading).toBe(90)

    // 3. Event relatif berikutnya harus diabaikan (tidak menimpa heading maupun source)
    act(() => {
      const relEvent2 = new Event('deviceorientation') as DeviceOrientationEvent & {
        alpha: number
        beta: number
        gamma: number
        absolute: boolean
      }
      relEvent2.alpha = 0
      relEvent2.beta = 0
      relEvent2.gamma = 0
      relEvent2.absolute = false
      window.dispatchEvent(relEvent2)
    })

    expect(result.current.accuracySource).toBe('absolute')
    expect(result.current.heading).toBe(90)

    unmount()
  })
})

describe('computeGeodesicPoints', () => {
  it('menghasilkan titik awal, kurva great-circle, dan berakhir tepat di koordinat Ka\'bah', () => {
    const points = computeGeodesicPoints(-6.2088, 106.8456, KAABA_COORDS.latitude, KAABA_COORDS.longitude, 32)
    expect(points).toHaveLength(33)
    expect(points[0][0]).toBeCloseTo(-6.2088, 4)
    expect(points[0][1]).toBeCloseTo(106.8456, 4)
    expect(points[32][0]).toBeCloseTo(KAABA_COORDS.latitude, 4)
    expect(points[32][1]).toBeCloseTo(KAABA_COORDS.longitude, 4)
  })
})
