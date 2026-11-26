import { describe, it, expect } from 'vitest'
import { deviceById } from '@/data/devices'
import { chartRows, diameterAt, pressureFor } from './compliance'

describe('compliance charts', () => {
  it('reads the chart: nominal gives the labelled size, RBP the growth', () => {
    const sc = deviceById('sc-2.50x15')!
    expect(diameterAt(sc, 6)).toBeCloseTo(2.5, 6)
    expect(diameterAt(sc, 14)).toBeCloseTo(2.75, 6)
    expect(diameterAt(deviceById('des-3.00x18')!, 16)).toBeCloseTo(3.18, 6)
    expect(diameterAt(deviceById('nc-3.00x12')!, 20)).toBeCloseTo(3.12, 6)
    expect(diameterAt(sc, 1.5)).toBe(0)
  })

  it('finds the pressure for a diameter', () => {
    expect(pressureFor(deviceById('des-3.00x18')!, 3.1)).toBeCloseTo(9 + (7 / 0.06) * (3.1 / 3 - 1), 6)
    const nc = deviceById('nc-3.25x12')!
    expect(diameterAt(nc, pressureFor(nc, 3.3))).toBeCloseTo(3.3, 6)
  })

  it('prints chart rows from a few atm below nominal up to RBP', () => {
    const rows = chartRows(deviceById('nc-3.00x12')!)
    expect(rows[0]!.atm).toBe(6)
    expect(rows.at(-1)!.atm).toBe(20)
    expect(chartRows(deviceById('sc-2.50x15')!)[0]!.atm).toBe(2)
  })
})
