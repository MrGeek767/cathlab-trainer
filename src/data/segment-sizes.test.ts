import { describe, it, expect } from 'vitest'
import {
  SEGMENT_DIAMETERS_MM,
  SYNTAX_SEGMENT,
  applyAnatomy,
  segmentLengthMm,
} from './segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from './arteries'
import { LEFT_DOMINANT_SEGMENTS } from './arteries-left-dominant'
import { CODOMINANT_SEGMENTS } from './arteries-codominant'
import type { ArterySegment } from '@/types/anatomy'
import type { DominanceType } from '@/types/angles'

const VARIANTS: [DominanceType, ArterySegment[]][] = [
  ['right', RIGHT_DOMINANT_SEGMENTS],
  ['left', LEFT_DOMINANT_SEGMENTS],
  ['codominant', CODOMINANT_SEGMENTS],
]

const start = (dom: DominanceType, id: string) => SEGMENT_DIAMETERS_MM[dom][id]![0]
const end = (dom: DominanceType, id: string) => SEGMENT_DIAMETERS_MM[dom][id]![1]
const finet = (a: number, b: number) => 0.678 * (a + b)

describe('segment sizes', () => {
  it('every segment in every variant has a size and a SYNTAX entry', () => {
    for (const [dom, segs] of VARIANTS) {
      for (const s of segs) {
        expect(SEGMENT_DIAMETERS_MM[dom][s.id], `${dom}/${s.id} size`).toBeDefined()
        expect(s.id in SYNTAX_SEGMENT[dom], `${dom}/${s.id} SYNTAX`).toBe(true)
      }
    }
  })

  it('proximal sizes sit within ±1 SD of the published QCA means (right-dominant start diameters)', () => {
    // Indian Heart J 2021 (doi:10.1016/j.ihj.2021.04.001), 933 normal angiograms
    const published: [string, number, number][] = [
      ['lm', 4.16, 0.7],
      ['prox-lad', 3.22, 0.6],
      ['prox-lcx', 3.02, 0.62],
      ['prox-rca', 3.05, 0.65],
      ['d1', 1.76, 0.44],
      ['om1', 2.1, 0.5],
    ]
    for (const [id, mean, sd] of published) {
      expect(Math.abs(start('right', id) - mean), id).toBeLessThanOrEqual(sd)
    }
  })

  it('bifurcations obey Finet within 5% (right-dominant)', () => {
    const cases: [string, number, number][] = [
      ['LM', end('right', 'lm'), finet(start('right', 'prox-lad'), start('right', 'prox-lcx'))],
      ['LAD/D1', end('right', 'prox-lad'), finet(start('right', 'mid-lad'), start('right', 'd1'))],
      ['LCx/OM1', end('right', 'prox-lcx'), finet(start('right', 'dist-lcx'), start('right', 'om1'))],
      ['crux', end('right', 'dist-rca'), finet(start('right', 'pda'), start('right', 'plv'))],
    ]
    for (const [name, parentEnd, predicted] of cases) {
      expect(Math.abs(parentEnd - predicted) / predicted, name).toBeLessThan(0.05)
    }
  })

  it('vessels never widen downstream', () => {
    const endChildren = ['prox-lad', 'prox-lcx', 'mid-lad', 'dist-lad', 'dist-lcx', 'mid-rca', 'dist-rca', 'pda', 'plv']
    for (const [dom, segs] of VARIANTS) {
      for (const s of segs) {
        if (!s.parentId) continue
        expect(start(dom, s.id), `${dom}/${s.id} vs parent start`).toBeLessThanOrEqual(start(dom, s.parentId))
        if (endChildren.includes(s.id)) {
          expect(start(dom, s.id), `${dom}/${s.id} vs parent end`).toBeLessThanOrEqual(end(dom, s.parentId))
        }
      }
    }
  })

  it('left dominance: smaller RCA, larger LCx than right dominance', () => {
    expect(start('left', 'prox-rca')).toBeLessThan(start('right', 'prox-rca'))
    expect(start('left', 'prox-lcx')).toBeGreaterThan(start('right', 'prox-lcx'))
  })

  it('SYNTAX numbers follow dominance', () => {
    expect(SYNTAX_SEGMENT.right.pda).toBe('4')
    expect(SYNTAX_SEGMENT.right.plv).toBe('16')
    expect(SYNTAX_SEGMENT.left.pda).toBe('15')
    expect(SYNTAX_SEGMENT.left.plv).toBe('14')
    expect(SYNTAX_SEGMENT.codominant.pda).toBe('4')
    expect(SYNTAX_SEGMENT.codominant.plv).toBe('14')
    expect(SYNTAX_SEGMENT.right.sep1).toBeNull()
    expect(SYNTAX_SEGMENT.right.am).toBeNull()
    expect(SYNTAX_SEGMENT.right.om1).toBe('12a')
    expect(SYNTAX_SEGMENT.right.om2).toBe('12b')
    expect(SYNTAX_SEGMENT.right.lm).toBe('5')
  })

  it('applyAnatomy sets radii to half the diameters and throws on unknown ids', () => {
    const lm = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right').find(s => s.id === 'lm')!
    expect(lm.startRadius).toBe(2.1)
    expect(lm.endRadius).toBe(2.1)
    expect(lm.syntaxSegment).toBe('5')
    const rawLm = RIGHT_DOMINANT_SEGMENTS.find(s => s.id === 'lm')!
    expect(() => applyAnatomy([{ ...rawLm, id: 'xyz' }], 'right')).toThrow(/No size for segment xyz/)
  })

  it('real-world lengths are adult-sized (right-dominant)', () => {
    const byId = new Map(RIGHT_DOMINANT_SEGMENTS.map(s => [s.id, s]))
    const len = (...ids: string[]) => ids.reduce((sum, id) => sum + segmentLengthMm(byId.get(id)!), 0)
    const lad = len('prox-lad', 'mid-lad', 'dist-lad')
    const rca = len('prox-rca', 'mid-rca', 'dist-rca')
    const lm = len('lm')
    expect(lad).toBeGreaterThanOrEqual(90)
    expect(lad).toBeLessThanOrEqual(130)
    expect(rca).toBeGreaterThanOrEqual(100)
    expect(rca).toBeLessThanOrEqual(150)
    expect(lm).toBeGreaterThanOrEqual(5)
    expect(lm).toBeLessThanOrEqual(20)
  })
})
