import { describe, expect, it } from 'vitest'
import {
  computeTiltCompensatedHeading,
  extractHeadingFromEvent,
  smoothCircularHeading,
} from '../useQiblaCompass'

describe('computeTiltCompensatedHeading', () => {
  it('mengonversi alpha W3C (counter-clockwise) ke kompas searah jarum jam saat ponsel datar', () => {
    expect(computeTiltCompensatedHeading(0, 0, 0, 0)).toBe(0)
    expect(computeTiltCompensatedHeading(90, 0, 0, 0)).toBe(270)
    expect(computeTiltCompensatedHeading(180, 0, 0, 0)).toBe(180)
    expect(computeTiltCompensatedHeading(270, 0, 0, 0)).toBe(90)
  })

  it('menghitung heading tanpa lonjakan saat ponsel dimiringkan 45° atau tegak 80°', () => {
    expect(computeTiltCompensatedHeading(90, 45, 15, 0)).toBe(270)
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
