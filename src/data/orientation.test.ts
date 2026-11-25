import { describe, it, expect } from 'vitest'
import { orientAnatomy } from './orientation'
import { RIGHT_DOMINANT_SEGMENTS } from './arteries'
import { computeCameraBasis } from '@/utils/carm-math'

/**
 * Textbook appearance of the coronary tree in standard views:
 * - RCA looks like a "C" in LAO and an "L" in RAO (wikidoc, Coronary angiography: RCA).
 * - In LAO the AV-groove loop is seen face-on: RCA "C", circumflex a backwards "C";
 *   the LAD and PDA run top to bottom. In RAO they run from the base on the left of the
 *   image to the apex on the right (Heldman coronary anatomy diagrams).
 */
const segs = new Map(orientAnatomy(RIGHT_DOMINANT_SEGMENTS).map(s => [s.id, s]))
const cp = (id: string, i: number) => {
  const pts = segs.get(id)!.controlPoints
  return pts[i < 0 ? pts.length + i : i]!
}

function project(p: [number, number, number], raoLao: number, cranialCaudal: number) {
  const { right, up } = computeCameraBasis(raoLao, cranialCaudal)
  return {
    x: p[0] * right[0] + p[1] * right[1] + p[2] * right[2],
    y: p[0] * up[0] + p[1] * up[1] + p[2] * up[2],
  }
}

const LAO = [45, 0] as const
const RAO = [-30, 0] as const
const ostium = () => cp('prox-rca', 0)
const acuteMargin = () => cp('mid-rca', 2)
const crux = () => cp('dist-rca', -1)
const pdaEnd = () => cp('pda', -1)
const ladStart = () => cp('prox-lad', 0)
const ladEnd = () => cp('dist-lad', -1)
const obtuseMargin = () => cp('prox-lcx', -1)
const lcxEnd = () => cp('dist-lcx', -1)

describe('heart orientation reproduces the textbook views', () => {
  it('RCA is a "C" in LAO: the acute margin bulges left of both the ostium and the crux', () => {
    const o = project(ostium(), ...LAO)
    const a = project(acuteMargin(), ...LAO)
    const c = project(crux(), ...LAO)
    const height = o.y - c.y
    expect(height).toBeGreaterThan(0)
    expect(Math.min(o.x - a.x, c.x - a.x)).toBeGreaterThanOrEqual(0.25 * height)
  })

  it('RCA is an "L" in RAO: ostium to crux runs nearly straight down', () => {
    const pts = [ostium(), acuteMargin(), crux()].map(p => project(p, ...RAO))
    const xs = pts.map(p => p.x)
    const ys = pts.map(p => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(0.35 * (Math.max(...ys) - Math.min(...ys)))
  })

  it('in RAO the PDA runs toward the apex on the image right', () => {
    const c = project(crux(), ...RAO)
    const e = project(pdaEnd(), ...RAO)
    expect(e.x - c.x).toBeGreaterThan(Math.abs(e.y - c.y))
  })

  it('in LAO the LAD runs from top to bottom', () => {
    const s = project(ladStart(), ...LAO)
    const e = project(ladEnd(), ...LAO)
    expect(Math.abs(e.y - s.y)).toBeGreaterThan(Math.abs(e.x - s.x))
  })

  it('in RAO the LAD runs from the base on the left to the apex on the right', () => {
    expect(project(ladEnd(), ...RAO).x).toBeGreaterThan(project(ladStart(), ...RAO).x)
  })

  it('the circumflex is a backwards "C" in LAO: the obtuse margin is its rightmost point', () => {
    const om = project(obtuseMargin(), ...LAO)
    expect(om.x).toBeGreaterThan(Math.max(project(ladStart(), ...LAO).x, project(lcxEnd(), ...LAO).x))
  })

  it("in AP the RCA lies on the viewer's left and the circumflex on the right", () => {
    expect(project(acuteMargin(), 0, 0).x).toBeLessThan(0)
    expect(project(obtuseMargin(), 0, 0).x).toBeGreaterThan(0)
  })
})
