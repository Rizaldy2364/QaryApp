import { describe, expect, it } from 'vitest'
import {
  computeHeadingFromQuaternion,
  computeTiltCompensatedHeading,
  extractHeadingFromEvent,
  smoothCircularHeading,
} from '../useQiblaCompass'

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
