import { describe, it, expect } from 'vitest'
import { deviceById } from '@/data/devices'
import { balloonDiameterShown, markerPositions, shoulderProfile } from './device-shapes'

describe('device shapes on the monitor', () => {
  it('puts the markers at the ends of the working length', () => {
    expect(markerPositions(deviceById('des-3.00x18')!, 40)).toEqual([22, 40])
  })

  it('shows the balloon only when it is open', () => {
    const balloon = deviceById('sc-2.50x15')!
    expect(balloonDiameterShown(balloon, null)).toBe(0)
    expect(balloonDiameterShown(balloon, 1)).toBe(0)
    expect(balloonDiameterShown(balloon, 6)).toBeCloseTo(2.5, 6)
  })

  it('rounds the balloon off at its shoulders', () => {
    const profile = shoulderProfile(15, 1.5)
    expect(profile(0)).toBeCloseTo(0, 6)
    expect(profile(0.5)).toBeCloseTo(1, 6)
    expect(profile(1)).toBeCloseTo(0, 6)
    expect(profile(0.75 / 15)).toBeGreaterThan(0.2)
    expect(profile(0.75 / 15)).toBeLessThan(0.8)
  })
})
