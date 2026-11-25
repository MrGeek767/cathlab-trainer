import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { MM_TO_SCENE } from '@/utils/geometry'
import { lumenChordMm, lumenMaterial, CROSSING_DEPTH_MM } from './density'

describe('lumenChordMm: X-ray path through a contrast-filled vessel', () => {
  it('is the full diameter through the middle of a vessel that lies across the beam', () => {
    expect(lumenChordMm(1.5, 1, 1)).toBeCloseTo(3, 6)
  })

  it('falls to nothing at the vessel edge', () => {
    expect(lumenChordMm(1.5, 0, 1)).toBeCloseTo(0, 6)
  })

  it('grows when the vessel turns toward the beam, as foreshortened vessels look denser', () => {
    // A vessel 30 degrees off the beam: through the middle, the ray meets the wall at
    // facing = sin(30) and travels 2r / sin(30) through contrast.
    expect(lumenChordMm(1.5, 0.5, 0.5)).toBeCloseTo(6, 6)
    expect(lumenChordMm(1.5, 0.5, 0.5)).toBeGreaterThan(lumenChordMm(1.5, 1, 1))
  })

  it('is capped for a vessel seen nearly end-on, whose real length limits the path', () => {
    const endOn = lumenChordMm(1.5, 0.05, 0.05)
    expect(endOn).toBeCloseTo(3 / 0.35, 6)
    expect(lumenChordMm(1.5, 0.2, 0.2)).toBeCloseTo(endOn, 6)
  })
})

describe('lumenMaterial: two passes for contrast-filled vessels', () => {
  it('front pass keeps the nearest vessel only, so a joint or branch origin is not counted twice', () => {
    const front = lumenMaterial('front')
    expect(front.depthTest).toBe(true)
    expect(front.depthWrite).toBe(true)
    expect(front.blending).toBe(THREE.NoBlending)
  })

  it('behind pass adds vessels lying well behind the front one, so crossings darken', () => {
    const behind = lumenMaterial('behind')
    expect(behind.depthFunc).toBe(THREE.GreaterDepth)
    expect(behind.depthWrite).toBe(false)
    expect(behind.blending).toBe(THREE.AdditiveBlending)
    expect(Number(behind.defines.BEHIND_OFFSET)).toBeCloseTo(CROSSING_DEPTH_MM * MM_TO_SCENE, 4)
  })
})
