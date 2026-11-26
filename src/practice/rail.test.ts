import { describe, it, expect } from 'vitest'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { buildVesselPaths } from '@/utils/vessel-paths'
import { MM_TO_SCENE } from '@/utils/geometry'
import { LAD_RAIL, buildRail } from './rail'

const segments = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')
const paths = buildVesselPaths(segments)
const rail = buildRail(LAD_RAIL, paths)
const mm = (id: string) => paths.get(id)!.getLength() / MM_TO_SCENE

describe('buildRail: the course devices ride along', () => {
  it('runs from the left main ostium to the end of the LAD', () => {
    expect(rail.pointAt(0).distanceTo(paths.get('lm')!.getPointAt(0))).toBeLessThan(1e-6)
    expect(rail.pointAt(rail.lengthMm).distanceTo(paths.get('dist-lad')!.getPointAt(1))).toBeLessThan(1e-6)
    expect(rail.lengthMm).toBeCloseTo(mm('lm') + mm('prox-lad') + mm('mid-lad') + mm('dist-lad'), 6)
  })

  it('knows where each segment starts', () => {
    expect(rail.startOf('lm')).toBe(0)
    expect(rail.startOf('prox-lad')).toBeCloseTo(mm('lm'), 6)
    expect(rail.pointAt(rail.startOf('mid-lad') + 1).distanceTo(paths.get('mid-lad')!.getPointAt(1 / mm('mid-lad')))).toBeLessThan(1e-4)
  })

  it('clamps outside its ends', () => {
    expect(rail.pointAt(-5).distanceTo(rail.pointAt(0))).toBeLessThan(1e-9)
    expect(rail.pointAt(rail.lengthMm + 9).distanceTo(rail.pointAt(rail.lengthMm))).toBeLessThan(1e-9)
  })

  it('points along the vessel', () => {
    expect(rail.tangentAt(rail.startOf('prox-lad') + 5).length()).toBeCloseTo(1, 6)
  })
})
