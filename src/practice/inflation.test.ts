import { describe, it, expect } from 'vitest'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { deviceById } from '@/data/devices'
import { PRACTICE_LESION, initialLumen, narrowest } from './lesion'
import { applyInflation, type Vessel } from './inflation'

const segment = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right').find(s => s.id === 'prox-lad')!
const LENGTH = 31
const fresh = (): Vessel => ({ lumen: initialLumen(segment, LENGTH, PRACTICE_LESION), stent: null, predilated: false })
const inflate = (vessel: Vessel, id: string, startMm: number, endMm: number, atm: number) =>
  applyInflation(vessel, deviceById(id)!, { startMm, endMm }, atm, segment, LENGTH, PRACTICE_LESION)
const kinds = (findings: { kind: string }[]) => findings.map(f => f.kind)
const predilated = () => inflate(fresh(), 'sc-2.50x15', 5, 20, 6).vessel

describe('applyInflation: how the lesion responds', () => {
  it('a balloon opens the lesion and the vessel recoils to 75% of it', () => {
    const { vessel, findings } = inflate(fresh(), 'sc-2.50x15', 5, 20, 6)
    expect(narrowest(vessel.lumen, 8, 20).diameterMm).toBeCloseTo(0.75 * 2.5, 6)
    expect(vessel.predilated).toBe(true)
    expect(findings).toEqual([])
  })

  it('marks the vessel prepared only when the balloon covers most of the lesion', () => {
    const most = inflate(fresh(), 'sc-2.50x12', 10, 20, 6)
    expect(most.vessel.predilated).toBe(true)
    expect(most.findings).toContainEqual({ kind: 'partial-cover', coveredFraction: expect.closeTo(10 / 12, 6) })
    expect(inflate(fresh(), 'sc-2.50x12', 14, 20, 6).vessel.predilated).toBe(false)
  })

  it('a 3.0 stent at nominal after predilation leaves residual narrowing', () => {
    const { vessel, findings } = inflate(predilated(), 'des-3.00x18', 5, 23, 9)
    expect(vessel.stent).toEqual({ startMm: 5, endMm: 23, nominalDiameterMm: 3, missedLesion: false })
    const residual = findings.find(f => f.kind === 'residual-stenosis') as { percentOfReference: number } | undefined
    expect(residual).toBeDefined()
    expect(residual!.percentOfReference).toBeGreaterThan(84)
    expect(residual!.percentOfReference).toBeLessThan(88)
  })

  it('the same stent at 13 atm is within 90% of the reference', () => {
    expect(kinds(inflate(predilated(), 'des-3.00x18', 5, 23, 13).findings)).not.toContain('residual-stenosis')
  })

  it('without predilation the stent expands less', () => {
    const { vessel, findings } = inflate(fresh(), 'des-3.00x18', 5, 23, 9)
    expect(narrowest(vessel.lumen, 8, 20).diameterMm).toBeCloseTo(0.85 * 3, 6)
    expect(kinds(findings)).toContain('residual-stenosis')
  })

  it('NC post-dilation brings the stent to 97% of the balloon chart size', () => {
    const stented = inflate(predilated(), 'des-3.00x18', 5, 23, 9).vessel
    const { vessel, findings } = inflate(stented, 'nc-3.25x12', 8, 20, 10)
    expect(narrowest(vessel.lumen, 8, 20).diameterMm).toBeCloseTo(0.97 * 3.25, 6)
    expect(kinds(findings)).not.toContain('residual-stenosis')
    expect(kinds(findings)).not.toContain('edge-dissection-risk')
  })

  it('a stent that leaves less than 2 mm at an end is a geographic miss', () => {
    const { findings } = inflate(predilated(), 'des-3.00x15', 7, 22, 13)
    expect(findings).toContainEqual({ kind: 'geographic-miss', uncoveredMm: expect.closeTo(1, 6) })
  })

  it('an oversized stent risks edge dissection', () => {
    const edges = inflate(predilated(), 'des-3.50x18', 5, 23, 16).findings.filter(f => f.kind === 'edge-dissection-risk')
    expect(edges).toHaveLength(2)
    for (const edge of edges as { ratio: number }[]) expect(edge.ratio).toBeGreaterThan(1.1)
  })

  it('a stent that covers none of the lesion is a miss, not a short landing zone', () => {
    const { vessel, findings } = inflate(predilated(), 'des-3.00x18', 30, 48, 13)
    expect(findings).toContainEqual({ kind: 'missed-lesion', by: 'stent' })
    expect(kinds(findings)).not.toContain('geographic-miss')
    expect(vessel.stent!.missedLesion).toBe(true)
  })

  it('a stent that covers the lesion and its landing zones is not missed', () => {
    expect(inflate(predilated(), 'des-3.00x18', 5, 23, 13).vessel.stent!.missedLesion).toBe(false)
  })

  it('a balloon beside the lesion is a miss and prepares nothing', () => {
    const { vessel, findings } = inflate(fresh(), 'sc-2.50x15', 30, 45, 6)
    expect(findings).toEqual([{ kind: 'missed-lesion', by: 'balloon' }])
    expect(vessel.predilated).toBe(false)
  })

  it('a post-dilation balloon outside the stent is a miss', () => {
    const stented = inflate(predilated(), 'des-3.00x18', 5, 23, 13).vessel
    expect(kinds(inflate(stented, 'nc-3.25x12', 33, 45, 16).findings)).toContain('missed-stent')
  })

  it('a deflated device (under 2 atm) changes nothing', () => {
    const before = fresh()
    const { vessel, findings } = inflate(before, 'sc-2.50x15', 5, 20, 1.5)
    expect(vessel).toEqual(before)
    expect(findings).toEqual([])
  })
})
