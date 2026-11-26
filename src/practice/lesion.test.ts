import { describe, it, expect } from 'vitest'
import type { ArterySegment } from '@/types/anatomy'
import { PRACTICE_LESION, initialLumen, lumenAt, narrowest, referenceAt } from './lesion'

const seg = { id: 'prox-lad', startRadius: 1.6, endRadius: 1.55 } as ArterySegment

describe('the practice lesion', () => {
  it('sits in the proximal LAD: 12 mm long, 8 mm in, 75% narrowing', () => {
    expect(PRACTICE_LESION).toEqual({ segmentId: 'prox-lad', startMm: 8, lengthMm: 12, stenosis: 0.75 })
  })

  it('tapers the reference from the start to the end of the segment', () => {
    expect(referenceAt(seg, 31, 0)).toBeCloseTo(3.2, 6)
    expect(referenceAt(seg, 31, 31)).toBeCloseTo(3.1, 6)
    expect(referenceAt(seg, 31, 40)).toBeCloseTo(3.1, 6)
  })

  it('is the reference outside the lesion', () => {
    const lumen = initialLumen(seg, 31, PRACTICE_LESION)
    expect(lumenAt(lumen, 2)).toBeCloseTo(referenceAt(seg, 31, 2), 6)
    expect(lumenAt(lumen, 25)).toBeCloseTo(referenceAt(seg, 31, 25), 6)
  })

  it('narrows to a quarter of the reference at the lesion centre (75% stenosis)', () => {
    const lumen = initialLumen(seg, 31, PRACTICE_LESION)
    const n = narrowest(lumen, 8, 20)
    expect(n.mm).toBeCloseTo(14, 0)
    expect(n.diameterMm / referenceAt(seg, 31, 14)).toBeCloseTo(0.25, 2)
  })

  it('covers the whole drawn segment', () => {
    expect(initialLumen(seg, 31, PRACTICE_LESION).diameters).toHaveLength(31 / 0.5 + 1)
  })

  it('reads between samples and clamps past the ends', () => {
    const lumen = { stepMm: 0.5, diameters: [2, 3] }
    expect(lumenAt(lumen, 0.25)).toBeCloseTo(2.5, 6)
    expect(lumenAt(lumen, -1)).toBe(2)
    expect(lumenAt(lumen, 9)).toBe(3)
  })
})
