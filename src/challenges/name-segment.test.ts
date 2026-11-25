import { describe, it, expect } from 'vitest'
import type { ArterySegment } from '@/types/anatomy'
import { bestPresetFor, buildNameSegmentQuestion, segmentLabel } from './name-segment'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { LEFT_DOMINANT_SEGMENTS } from '@/data/arteries-left-dominant'
import { CODOMINANT_SEGMENTS } from '@/data/arteries-codominant'
import { applyAnatomy } from '@/data/segment-sizes'
import { VIEW_PRESETS } from '@/data/presets'
import { sideOf } from '@/utils/contrast'

/** Small seeded generator, so every run sees the same questions. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const VARIANTS = {
  right: applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right'),
  left: applyAnatomy(LEFT_DOMINANT_SEGMENTS, 'left'),
  codominant: applyAnatomy(CODOMINANT_SEGMENTS, 'codominant'),
}

function find(segments: ArterySegment[], id: string): ArterySegment {
  const segment = segments.find(s => s.id === id)
  if (!segment) throw new Error(`missing ${id}`)
  return segment
}

describe('name the segment', () => {
  it('bestPresetFor picks the textbook-ideal view', () => {
    expect(bestPresetFor('mid-lad')).toBe('ap-cranial')
    expect(bestPresetFor('dist-lad')).toBe('rao-caudal')
    expect(bestPresetFor('mid-rca')).toBe('rao-straight')
  })

  it('questions are valid for every variant and seed', () => {
    for (const [variant, segments] of Object.entries(VARIANTS)) {
      for (let seed = 1; seed <= 50; seed++) {
        const question = buildNameSegmentQuestion(segments, mulberry32(seed))
        const where = `${variant}, seed ${seed}`
        const target = find(segments, question.segmentId)
        expect(question.answer, where).toBe(question.segmentId)
        expect(question.options, where).toHaveLength(4)
        expect(new Set(question.options).size, where).toBe(4)
        expect(question.options, where).toContain(question.answer)
        expect(question.options.every(id => segments.some(s => s.id === id)), where).toBe(true)
        expect(VIEW_PRESETS.some(p => p.id === question.presetId), where).toBe(true)
        expect(question.side, where).toBe(sideOf(target))
      }
    }
  })

  it('labels show SYNTAX numbers where they exist', () => {
    expect(segmentLabel(find(VARIANTS.right, 'mid-lad'))).toBe('Mid LAD (segment 7)')
    expect(segmentLabel(find(VARIANTS.right, 'am'))).toBe('Acute Marginal')
  })

  it('wrong options come from the side being shown', () => {
    for (const [variant, segments] of Object.entries(VARIANTS)) {
      for (let seed = 1; seed <= 50; seed++) {
        const question = buildNameSegmentQuestion(segments, mulberry32(seed))
        const sides = question.options.map(id => sideOf(find(segments, id)))
        expect(sides.every(side => side === question.side), `${variant}, seed ${seed}`).toBe(true)
      }
    }
  })
})
