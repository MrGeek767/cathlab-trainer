import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { ANATOMY_SCALE, MM_TO_SCENE } from './geometry'
import { catheterPath } from './catheter'

const ostium = (id: string) =>
  new THREE.Vector3(...RIGHT_DOMINANT_SEGMENTS.find(s => s.id === id)!.controlPoints[0]!).multiplyScalar(ANATOMY_SCALE)

describe('catheterPath: the guide catheter seated in the injected coronary', () => {
  for (const [side, id] of [['left', 'lm'], ['right', 'prox-rca']] as const) {
    it(`${side}: its tip sits just inside the ${id} ostium`, () => {
      const path = catheterPath(RIGHT_DOMINANT_SEGMENTS, side)!
      expect(path.getPointAt(0).distanceTo(ostium(id)) / MM_TO_SCENE).toBeLessThan(4)
    })

    it(`${side}: it runs back up the ascending aorta, out of the top of the field`, () => {
      const path = catheterPath(RIGHT_DOMINANT_SEGMENTS, side)!
      const rise = (path.getPointAt(1).y - path.getPointAt(0).y) / MM_TO_SCENE
      expect(rise).toBeGreaterThan(90)
    })
  }

  it('is absent when the anatomy has no such ostium', () => {
    expect(catheterPath([], 'left')).toBeNull()
  })
})
