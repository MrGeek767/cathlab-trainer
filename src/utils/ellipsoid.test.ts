import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { fitEllipsoid } from './ellipsoid'

/** Evenly spread directions on the unit sphere (Fibonacci lattice). */
function sphere(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count
    const r = Math.sqrt(1 - y * y)
    points.push(new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r))
  }
  return points
}

describe('fitEllipsoid', () => {
  it('recovers the centre, radii and axes of a rotated ellipsoid', () => {
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, -0.7, 0.3))
    const centre = new THREE.Vector3(1, 2, 3)
    const points = sphere(4000).map(u =>
      new THREE.Vector3(u.x * 3, u.y * 2, u.z * 1).applyQuaternion(rotation).add(centre),
    )
    const fit = fitEllipsoid(points.map(p => [p.x, p.y, p.z] as [number, number, number]))

    expect(fit.center[0]).toBeCloseTo(1, 2)
    expect(fit.center[1]).toBeCloseTo(2, 2)
    expect(fit.center[2]).toBeCloseTo(3, 2)
    expect(fit.radii[0]).toBeCloseTo(3, 1)
    expect(fit.radii[1]).toBeCloseTo(2, 1)
    expect(fit.radii[2]).toBeCloseTo(1, 1)

    const longest = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation)
    expect(Math.abs(new THREE.Vector3(...fit.axes[0]).dot(longest))).toBeGreaterThan(0.999)
  })

  it('returns a right-handed set of unit axes', () => {
    const points: [number, number, number][] = sphere(500).map(u => [u.x * 2, u.y, u.z * 0.5])
    const { axes } = fitEllipsoid(points)
    const [a, b, c] = axes.map(axis => new THREE.Vector3(...axis))
    expect(a!.length()).toBeCloseTo(1, 6)
    expect(b!.length()).toBeCloseTo(1, 6)
    expect(a!.dot(b!)).toBeCloseTo(0, 6)
    expect(new THREE.Vector3().crossVectors(a!, b!).dot(c!)).toBeCloseTo(1, 6)
  })
})
