import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { ANATOMY_SCALE, MM_TO_SCENE } from './geometry'
import { catheterPath, catheterMotionWeight } from './catheter'

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

describe('catheterMotionWeight: how much of the heart\'s motion each part of the catheter takes', () => {
  it('moves the engaged tip fully with the ostium', () => {
    expect(catheterMotionWeight(0)).toBe(1)
    expect(catheterMotionWeight(10)).toBe(1)
  })

  it('leaves the shaft in the ascending aorta still, like the aortic shadow around it', () => {
    expect(catheterMotionWeight(50)).toBe(0)
    expect(catheterMotionWeight(120)).toBe(0)
  })

  it('fades smoothly in between', () => {
    let previous = 1
    for (let mm = 10; mm <= 50; mm += 2) {
      const w = catheterMotionWeight(mm)
      expect(w).toBeLessThanOrEqual(previous)
      previous = w
    }
    expect(catheterMotionWeight(30)).toBeGreaterThan(0.2)
    expect(catheterMotionWeight(30)).toBeLessThan(0.8)
  })
})

