import { describe, it, expect } from 'vitest'
import { BALLOONS, STENTS, deviceById, deviceName } from './devices'

describe('device shelf', () => {
  it('lists the sizes in the spec', () => {
    expect(BALLOONS.filter(b => b.kind === 'semi-compliant')).toHaveLength(9 * 3)
    expect(BALLOONS.filter(b => b.kind === 'non-compliant')).toHaveLength(11 * 3)
    expect(STENTS).toHaveLength(8 * 8)
    expect(deviceById('des-3.00x18')?.category).toBe('stent')
    expect(deviceById('nc-4.50x15')?.category).toBe('balloon')
    expect(deviceById('sc-4.25x12')).toBeUndefined()
  })

  it('names devices plainly, with no brands', () => {
    expect(deviceName(deviceById('sc-2.50x15')!)).toBe('Semi-compliant balloon 2.50 × 15 mm')
    expect(deviceName(deviceById('nc-3.25x12')!)).toBe('Non-compliant balloon 3.25 × 12 mm')
    expect(deviceName(deviceById('des-3.00x18')!)).toBe('Drug-eluting stent 3.00 × 18 mm')
  })

  it('gives every id once', () => {
    const ids = [...BALLOONS, ...STENTS].map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
