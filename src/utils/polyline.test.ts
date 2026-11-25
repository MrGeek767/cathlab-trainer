import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { slicePolyline3D, tubeDrawRange } from './polyline'

// Straight line from (0,0,0) to (10,0,0), sampled at 11 points.
const line = Array.from({ length: 11 }, (_, i) => new THREE.Vector3(i, 0, 0))

describe('slicePolyline3D', () => {
  it('full range returns the same end points', () => {
    const s = slicePolyline3D(line, 0, 1)
    expect(s[0]!.x).toBeCloseTo(0)
    expect(s[s.length - 1]!.x).toBeCloseTo(10)
  })

  it('half range ends half-way along the length', () => {
    const s = slicePolyline3D(line, 0, 0.5)
    expect(s[0]!.x).toBeCloseTo(0)
    expect(s[s.length - 1]!.x).toBeCloseTo(5)
  })

  it('a middle slice starts and ends at interpolated points', () => {
    const s = slicePolyline3D(line, 0.25, 0.75)
    expect(s[0]!.x).toBeCloseTo(2.5)
    expect(s[s.length - 1]!.x).toBeCloseTo(7.5)
  })

  it('slices by length even when samples are uneven', () => {
    // Points crowd at the start: 0, 0.5, 1, 10 — half the length is x = 5.
    const uneven = [0, 0.5, 1, 10].map(x => new THREE.Vector3(x, 0, 0))
    const s = slicePolyline3D(uneven, 0, 0.5)
    expect(s[s.length - 1]!.x).toBeCloseTo(5)
  })

  it('an empty or inverted range returns []', () => {
    expect(slicePolyline3D(line, 0.5, 0.5)).toEqual([])
    expect(slicePolyline3D(line, 0.7, 0.2)).toEqual([])
  })
})

describe('tubeDrawRange', () => {
  // 64 tubular segments × 8 radial segments × 6 indices = 3072 indices per tube
  it('draws the whole tube when there is no cine', () =>
    expect(tubeDrawRange(null, 64, 8)).toEqual({ start: 0, count: Infinity }))
  it('a fully opaque range draws every index', () =>
    expect(tubeDrawRange({ from: 0, to: 1 }, 64, 8)).toEqual({ start: 0, count: 3072 }))
  it('the first half draws the first 32 rings', () =>
    expect(tubeDrawRange({ from: 0, to: 0.5 }, 64, 8)).toEqual({ start: 0, count: 1536 }))
  it('a middle range starts part-way along the tube', () =>
    expect(tubeDrawRange({ from: 0.25, to: 0.75 }, 64, 8)).toEqual({ start: 768, count: 1536 }))
  it('a sliver still shows one ring', () =>
    expect(tubeDrawRange({ from: 0, to: 0.01 }, 64, 8)).toEqual({ start: 0, count: 48 }))
  it('an empty range draws nothing', () =>
    expect(tubeDrawRange({ from: 0.5, to: 0.5 }, 64, 8).count).toBe(0))
})
