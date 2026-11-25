import { describe, it, expect } from 'vitest'
import { ribPoints, RIB_LEVELS } from './ribs'

describe('ribs', () => {
  it('each rib starts beside the spine at the back and ends at the front, lower down', () => {
    for (const level of RIB_LEVELS) {
      const points = ribPoints('left', level)
      const [x0, y0, z0] = points[0]!
      const [x1, y1, z1] = points[points.length - 1]!
      expect(Math.abs(x0)).toBeLessThan(2) // beside the spine
      expect(z0).toBeLessThan(-5) // at the back
      expect(z1).toBeGreaterThan(2) // at the front
      expect(y1).toBeLessThan(y0) // ribs slope down toward the front
      expect(Math.abs(x1)).toBeGreaterThan(Math.abs(x0))
    }
  })

  it('the right ribs mirror the left', () => {
    const left = ribPoints('left', 2.5)
    const right = ribPoints('right', 2.5)
    left.forEach(([x, y, z], i) => {
      const [rx, ry, rz] = right[i]!
      expect(rx).toBeCloseTo(-x, 9)
      expect(ry).toBeCloseTo(y, 9)
      expect(rz).toBeCloseTo(z, 9)
    })
    // x is the patient's left, so left ribs sit at positive x
    expect(left[10]![0]).toBeGreaterThan(0)
  })

  it('every point is a finite number', () => {
    for (const level of RIB_LEVELS) {
      for (const point of [...ribPoints('left', level), ...ribPoints('right', level)]) {
        expect(point.every(Number.isFinite)).toBe(true)
      }
    }
  })
})
