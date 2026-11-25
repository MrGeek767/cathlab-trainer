import { describe, it, expect } from 'vitest'
import { projectSpine, diaphragmTopEdge } from './landmarks'

const maxY = (pts: { x: number; y: number }[]) => Math.max(...pts.map(p => p.y))

describe('orientation landmarks', () => {
  it("spine appears on the viewer's right in LAO and left in RAO", () => {
    expect(projectSpine(45, 0).x).toBeGreaterThan(0.5)
    expect(projectSpine(-30, 0).x).toBeLessThan(-0.5)
  })

  it('spine is central in AP', () => {
    expect(Math.abs(projectSpine(0, 0).x)).toBeLessThan(0.1)
  })

  it('right hemidiaphragm sits higher than the left in AP', () => {
    const edge = diaphragmTopEdge(0, 0)
    const right = edge.filter(p => p.x < 0) // patient's right is the viewer's left in AP
    const left = edge.filter(p => p.x > 0)
    expect(right.length).toBeGreaterThan(0)
    expect(left.length).toBeGreaterThan(0)
    expect(maxY(right)).toBeGreaterThan(maxY(left))
  })

  it('cranial angulation lifts the diaphragm into the image', () => {
    expect(maxY(diaphragmTopEdge(0, 30))).toBeGreaterThan(maxY(diaphragmTopEdge(0, 0)))
  })

  it('every value is finite at extreme angles', () => {
    for (const raoLao of [-90, 90]) {
      for (const cranialCaudal of [-45, 45]) {
        const spine = projectSpine(raoLao, cranialCaudal)
        expect(Number.isFinite(spine.x) && Number.isFinite(spine.width)).toBe(true)
        const edge = diaphragmTopEdge(raoLao, cranialCaudal)
        expect(edge.length).toBeGreaterThan(0)
        expect(edge.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
      }
    }
  })
})
