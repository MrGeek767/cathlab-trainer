import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  buildTaperedTubeGeometry,
  buildProfiledTubeGeometry,
  addRadiusAttribute,
  addRadiusProfileAttribute,
  addAxisAttribute,
  extendCurveEnds,
  MM_TO_SCENE,
} from './geometry'

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

describe('buildTaperedTubeGeometry', () => {
  it('a tube is as wide as the vessel it draws', () => {
    // 18 mm per anatomy unit, drawn at half scale.
    expect(MM_TO_SCENE).toBeCloseTo(1 / 36, 6)
    const straight = new THREE.CatmullRomCurve3([v(0, 0, 0), v(0, 1, 0), v(0, 2, 0)])
    const tube = buildTaperedTubeGeometry(straight, 1.5, 1.5) // a 3 mm vessel
    const position = tube.attributes.position!
    for (let i = 0; i < position.count; i++) {
      expect(Math.hypot(position.getX(i), position.getZ(i))).toBeCloseTo(1.5 * MM_TO_SCENE, 5)
    }
  })

  it('tapering keeps every ring centred on the curve', () => {
    // Uneven control points: the curve's parameter is not its arc length, and the
    // tube places its rings by arc length.
    const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(1, 0.2, 0), v(1.5, 1.5, 0), v(1.6, 4, 0)])
    const rings = 32
    const sides = 8
    const tube = buildTaperedTubeGeometry(curve, 2, 1, rings, sides)
    const position = tube.attributes.position!
    for (let i = 0; i <= rings; i++) {
      const centre = new THREE.Vector3()
      for (let j = 0; j < sides; j++) {
        const index = i * (sides + 1) + j
        centre.add(v(position.getX(index), position.getY(index), position.getZ(index)))
      }
      centre.divideScalar(sides)
      expect(centre.distanceTo(curve.getPointAt(i / rings)), `ring ${i}`).toBeLessThan(1e-3)
    }
  })

  it('records the local vessel radius at every vertex, tapering from start to end', () => {
    const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(0, 1, 0), v(0, 2, 0)])
    const tube = buildTaperedTubeGeometry(curve, 2, 1, 16, 6)
    addRadiusAttribute(tube, 2, 1, 16, 6)
    const radius = tube.attributes.aRadius!
    expect(radius.count).toBe(tube.attributes.position!.count)
    expect(radius.getX(0)).toBeCloseTo(2, 6) // first ring
    expect(radius.getX(16 * 7)).toBeCloseTo(1, 6) // last ring
    expect(radius.getX(8 * 7)).toBeCloseTo(1.5, 6) // middle ring
  })
})

describe('extendCurveEnds', () => {
  // Neighbouring segments meet at an angle; a short overlap closes the seam between them.
  const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(1, 0.5, 0), v(2, 0, 0.5), v(3, -1, 0.5)])

  it('runs straight on past each end along the end tangents', () => {
    const extended = extendCurveEnds(curve, 0.2, 0.3)
    const start = curve.getPointAt(0).addScaledVector(curve.getTangentAt(0), -0.2)
    const end = curve.getPointAt(1).addScaledVector(curve.getTangentAt(1), 0.3)
    expect(extended.getPointAt(0).distanceTo(start)).toBeLessThan(1e-6)
    expect(extended.getPointAt(1).distanceTo(end)).toBeLessThan(1e-6)
  })

  it('keeps the original course in between', () => {
    const extended = extendCurveEnds(curve, 0.2, 0.3)
    const length = curve.getLength()
    expect(extended.getLength()).toBeCloseTo(length + 0.5, 3)
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const onExtended = extended.getPointAt((0.2 + f * length) / (length + 0.5))
      expect(onExtended.distanceTo(curve.getPointAt(f)), `at ${f}`).toBeLessThan(1e-3)
    }
  })
})

describe('addAxisAttribute', () => {
  it('stores the vessel direction at every vertex of each ring', () => {
    const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(1, 0.2, 0), v(1.5, 1.5, 0), v(1.6, 4, 0)])
    const rings = 16
    const sides = 6
    const tube = buildTaperedTubeGeometry(curve, 2, 1, rings, sides)
    addAxisAttribute(tube, rings, sides)
    const axis = tube.attributes.aAxis!
    expect(axis.count).toBe(tube.attributes.position!.count)
    for (const i of [0, 5, 16]) {
      const expected = curve.getTangentAt(i / rings)
      for (const j of [0, 3, 6]) {
        const index = i * (sides + 1) + j
        const got = v(axis.getX(index), axis.getY(index), axis.getZ(index))
        expect(got.angleTo(expected), `ring ${i}, side ${j}`).toBeLessThan(0.02)
      }
    }
  })
})

describe('buildProfiledTubeGeometry: a tube whose radius follows a profile', () => {
  it('shapes each ring to the profile, and records it per vertex', () => {
    const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(0, 1, 0), v(0, 2, 0)])
    const profile = (t: number) => (t > 0.4 && t < 0.6 ? 0.5 : 2)
    const tube = buildProfiledTubeGeometry(curve, profile, 20, 6)
    const position = tube.attributes.position!
    const ringRadius = (ring: number) => {
      const index = ring * 7
      const centre = curve.getPointAt(ring / 20)
      return v(position.getX(index), position.getY(index), position.getZ(index)).distanceTo(centre)
    }
    expect(ringRadius(10)).toBeCloseTo(0.5 * MM_TO_SCENE, 6)
    expect(ringRadius(0)).toBeCloseTo(2 * MM_TO_SCENE, 6)
    addRadiusProfileAttribute(tube, profile, 20, 6)
    expect(tube.attributes.aRadius!.getX(10 * 7)).toBeCloseTo(0.5, 6)
    expect(tube.attributes.aRadius!.getX(0)).toBeCloseTo(2, 6)
  })
})

