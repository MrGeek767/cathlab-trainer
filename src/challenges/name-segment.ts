import type { ArterySegment } from '@/types/anatomy'
import { QUALITY_MATRIX, RATING_SCORE } from '@/data/quality-matrix'
import { sideOf, type InjectionSide } from '@/utils/contrast'
import { shuffle } from '@/utils/shuffle'

/**
 * "Name the segment" challenge: the C-arm goes to the textbook view for one segment,
 * that segment is highlighted on its own side's injection, and the learner picks its
 * name from four options.
 */
export interface NameSegmentQuestion {
  segmentId: string
  presetId: string
  side: InjectionSide
  options: string[]
  answer: string
}

/** The matrix view that rates this segment highest; ties go to the earliest entry. */
export function bestPresetFor(segmentId: string): string {
  let bestId: string | null = null
  let bestScore = -Infinity
  for (const entry of QUALITY_MATRIX) {
    const score = RATING_SCORE[entry.ratings[segmentId] ?? '-']
    if (score > bestScore) {
      bestScore = score
      bestId = entry.presetId
    }
  }
  if (bestId === null) throw new Error('QUALITY_MATRIX is empty')
  return bestId
}

/**
 * Picks the target uniformly. Wrong options come from the same side as the target
 * where it has enough segments, since only that side is shown.
 */
export function buildNameSegmentQuestion(segments: ArterySegment[], rng: () => number): NameSegmentQuestion {
  if (segments.length < 4) throw new Error('Name the segment needs at least 4 segments')
  const target = segments[Math.min(segments.length - 1, Math.floor(rng() * segments.length))] as ArterySegment
  const side = sideOf(target)
  const others = segments.filter(s => s.id !== target.id)
  const sameSide = shuffle(others.filter(s => sideOf(s) === side), rng)
  const otherSide = shuffle(others.filter(s => sideOf(s) !== side), rng)
  const wrong = [...sameSide, ...otherSide].slice(0, 3).map(s => s.id)
  return {
    segmentId: target.id,
    presetId: bestPresetFor(target.id),
    side,
    options: shuffle([target.id, ...wrong], rng),
    answer: target.id,
  }
}

/** "Mid LAD (segment 7)", or just the name for segments without a SYNTAX number. */
export function segmentLabel(segment: ArterySegment): string {
  return segment.syntaxSegment != null ? `${segment.name} (segment ${segment.syntaxSegment})` : segment.name
}
