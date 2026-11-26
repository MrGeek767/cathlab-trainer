import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { ANATOMY_SCALE } from './geometry'
import { heartFromAnatomy, heartMatrixAt, heartMotionMatrix, HEART_MOTION } from './heart-motion'
import { cineFrameTime, contractionAt } from './cardiac-cycle'

const heart = heartFromAnatomy(RIGHT_DOMINANT_SEGMENTS)
const { pivot, apex } = heart.frame
const moved = (p: THREE.Vector3, c: number) => p.clone().applyMatrix4(heartMotionMatrix(heart.frame, c))

describe('heartFromAnatomy', () => {
  it('points the long axis toward the apex, where the LAD ends', () => {
    const lad = RIGHT_DOMINANT_SEGMENTS.find(s => s.id === 'dist-lad')!
    const end = new THREE.Vector3(...lad.controlPoints[lad.controlPoints.length - 1]!).multiplyScalar(ANATOMY_SCALE)
    const centre = new THREE.Vector3(...heart.ellipsoid.center)
    expect(apex.dot(end.sub(centre))).toBeGreaterThan(0)
    expect(apex.length()).toBeCloseTo(1, 6)
  })
})

describe('heartMotionMatrix: the heart squeezing in systole', () => {
  it('does nothing when the heart is relaxed', () => {
    expect(heartMotionMatrix(heart.frame, 0).equals(new THREE.Matrix4())).toBe(true)
  })

  it('keeps the pivot near the apex still', () => {
    expect(moved(pivot, 1).distanceTo(pivot)).toBeLessThan(1e-9)
  })

  it('draws the base down toward the apex', () => {
    const base = pivot.clone().addScaledVector(apex, -2)
    const after = moved(base, 1)
    expect(after.distanceTo(pivot)).toBeCloseTo(2 * (1 - HEART_MOTION.longitudinal), 6)
  })

  it('pulls the walls in toward the long axis and twists them a little', () => {
    const side = new THREE.Vector3(...heart.ellipsoid.axes[1]!)
    const wall = pivot.clone().addScaledVector(side, 1)
    const after = moved(wall, 1).sub(pivot)
    expect(after.length()).toBeCloseTo(1 - HEART_MOTION.radial, 6)
    expect(THREE.MathUtils.radToDeg(after.angleTo(side))).toBeCloseTo(HEART_MOTION.twistDeg, 4)
  })
})

describe('heartMatrixAt: the heart\'s pose at a moment, for everything that rides on it', () => {
  it('is the relaxed pose when the heart is not beating', () => {
    expect(heartMatrixAt(heart.frame, 300, { beating: false, heartRate: 70, stepped: true }).equals(new THREE.Matrix4())).toBe(true)
  })

  it('on the monitor, holds each pose for a whole 1/15 s frame', () => {
    const at = (t: number) => heartMatrixAt(heart.frame, t, { beating: true, heartRate: 70, stepped: true })
    expect(at(140).equals(at(180))).toBe(true) // the same cine frame
    const expected = heartMotionMatrix(heart.frame, contractionAt(cineFrameTime(140), 70))
    expect(at(140).equals(expected)).toBe(true)
  })

  it('in 3D, moves continuously', () => {
    const at = (t: number) => heartMatrixAt(heart.frame, t, { beating: true, heartRate: 70, stepped: false })
    expect(at(140).equals(at(180))).toBe(false)
  })
})

