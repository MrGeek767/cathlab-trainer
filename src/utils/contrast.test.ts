import { describe, it, expect } from 'vitest'
import { buildVesselTree, opacificationAt, cineDurationMs, DEFAULT_CINE_TIMING, type OpaqueRange } from './contrast'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { LEFT_DOMINANT_SEGMENTS } from '@/data/arteries-left-dominant'

const rightTree = buildVesselTree(applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right'))
const leftTree = buildVesselTree(applyAnatomy(LEFT_DOMINANT_SEGMENTS, 'left'))

const RCA_IDS = ['prox-rca', 'mid-rca', 'dist-rca', 'pda', 'plv', 'am']
const LEFT_IDS = ['lm', 'prox-lad', 'mid-lad', 'dist-lad', 'd1', 'd2', 'sep1', 'prox-lcx', 'dist-lcx', 'om1', 'om2']
const isEmpty = (r: OpaqueRange) => r.to - r.from <= 0

describe('contrast injection model', () => {
  it('a left injection never opacifies RCA segments', () => {
    for (let t = 0; t <= cineDurationMs() + 200; t += 100) {
      const op = opacificationAt(rightTree, 'left', t)
      for (const id of RCA_IDS) expect(isEmpty(op.get(id)!), `${id} at ${t} ms`).toBe(true)
    }
  })

  it('proximal fills before distal', () => {
    const op = opacificationAt(rightTree, 'left', 450)
    expect(op.get('lm')!.to).toBe(1)
    expect(op.get('dist-lad')!.to).toBeLessThan(1)
  })

  it('during hold every left segment is fully opaque', () => {
    const op = opacificationAt(rightTree, 'left', 1500)
    for (const id of LEFT_IDS) expect(op.get(id), id).toEqual({ from: 0, to: 1 })
  })

  it('washout clears from the ostium outward', () => {
    const { fillMs, holdMs, washoutMs } = DEFAULT_CINE_TIMING
    const op = opacificationAt(rightTree, 'left', fillMs + holdMs + washoutMs / 2)
    expect(isEmpty(op.get('lm')!)).toBe(true)
    expect(LEFT_IDS.some(id => !isEmpty(op.get(id)!))).toBe(true)
  })

  it('nothing is opaque after the run', () => {
    const op = opacificationAt(rightTree, 'left', cineDurationMs() + 1)
    expect(op.size).toBe(RIGHT_DOMINANT_SEGMENTS.length)
    for (const range of op.values()) expect(isEmpty(range)).toBe(true)
  })

  it('the contrast front only moves forward', () => {
    let previous = 0
    for (let t = 0; t <= DEFAULT_CINE_TIMING.fillMs; t += 50) {
      const to = opacificationAt(rightTree, 'left', t).get('mid-lad')!.to
      expect(to, `t=${t}`).toBeGreaterThanOrEqual(previous)
      previous = to
    }
    expect(previous).toBe(1)
  })

  it('side branches start part-way along their parent', () => {
    const d2 = rightTree.nodes.get('d2')!
    const midLad = rightTree.nodes.get('mid-lad')!
    expect(d2.startDistanceMm).toBeGreaterThan(midLad.startDistanceMm)
    expect(d2.startDistanceMm).toBeLessThan(midLad.startDistanceMm + midLad.lengthMm)
  })

  it('dominance decides which injection fills the PDA', () => {
    expect(opacificationAt(rightTree, 'right', 1500).get('pda')).toEqual({ from: 0, to: 1 })
    expect(opacificationAt(leftTree, 'left', 1500).get('pda')).toEqual({ from: 0, to: 1 })
    expect(isEmpty(opacificationAt(leftTree, 'right', 1500).get('pda')!)).toBe(true)
  })

  it('each variant tree contains only its own segment ids', () => {
    expect([...leftTree.nodes.keys()].sort()).toEqual(LEFT_DOMINANT_SEGMENTS.map(s => s.id).sort())
  })
})
