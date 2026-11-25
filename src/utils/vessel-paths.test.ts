import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { LEFT_DOMINANT_SEGMENTS } from '@/data/arteries-left-dominant'
import { buildArterySpline, ANATOMY_SCALE } from './geometry'
import { buildVesselPaths } from './vessel-paths'

const byId = (id: string) => RIGHT_DOMINANT_SEGMENTS.find(s => s.id === id)!
const scaled = (p: [number, number, number]) => new THREE.Vector3(...p).multiplyScalar(ANATOMY_SCALE)

describe('buildVesselPaths: drawn centre lines', () => {
  const paths = buildVesselPaths(RIGHT_DOMINANT_SEGMENTS)

  it('runs smoothly from one segment of an artery into the next, as a real vessel does', () => {
    for (const [a, b] of [['prox-lad', 'mid-lad'], ['mid-lad', 'dist-lad'], ['prox-lcx', 'dist-lcx'], ['prox-rca', 'mid-rca'], ['mid-rca', 'dist-rca']]) {
      const end = paths.get(a!)!.getTangentAt(1)
      const start = paths.get(b!)!.getTangentAt(0)
      expect(THREE.MathUtils.radToDeg(end.angleTo(start)), `${a} -> ${b}`).toBeLessThan(2)
    }
  })

  it('still starts and ends every segment at its own end points', () => {
    for (const segment of RIGHT_DOMINANT_SEGMENTS) {
      const path = paths.get(segment.id)!
      const first = scaled(segment.controlPoints[0]!)
      const last = scaled(segment.controlPoints[segment.controlPoints.length - 1]!)
      expect(path.getPointAt(0).distanceTo(first), `${segment.id} start`).toBeLessThan(1e-4)
      expect(path.getPointAt(1).distanceTo(last), `${segment.id} end`).toBeLessThan(1e-4)
    }
  })

  it('leaves branches and bifurcations as they are', () => {
    for (const id of ['lm', 'd1', 'om1', 'pda', 'plv', 'am']) {
      const own = buildArterySpline(byId(id).controlPoints)
      for (const t of [0.1, 0.5, 0.9]) {
        expect(paths.get(id)!.getPoint(t).distanceTo(own.getPoint(t)), `${id} at ${t}`).toBeLessThan(1e-6)
      }
    }
  })

  it('works for every dominance', () => {
    const left = buildVesselPaths(LEFT_DOMINANT_SEGMENTS)
    expect(left.size).toBe(LEFT_DOMINANT_SEGMENTS.length)
  })
})
