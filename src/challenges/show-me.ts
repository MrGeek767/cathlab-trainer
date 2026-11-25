import type { SegmentRating } from '@/types/quality'
import { interpolateSegmentScore, scoreToRating } from '@/data/quality-matrix'

/**
 * "Show me" challenge: the learner sets the C-arm to show a named segment well, then
 * takes the shot. Scored against the curated Di Mario view-quality ratings.
 */
export interface ShowMeItem {
  id: string
  segmentId: string
  prompt: string
}

export const SHOW_ME_ITEMS: ShowMeItem[] = [
  { id: 'show-mid-lad', segmentId: 'mid-lad', prompt: 'Show the mid LAD with its diagonals separated.' },
  { id: 'show-dist-lad', segmentId: 'dist-lad', prompt: 'Show the distal LAD.' },
  { id: 'show-lm', segmentId: 'lm', prompt: 'Show the left main.' },
  { id: 'show-prox-lcx', segmentId: 'prox-lcx', prompt: 'Show the proximal circumflex.' },
  { id: 'show-om1', segmentId: 'om1', prompt: 'Show the first obtuse marginal.' },
  { id: 'show-d1', segmentId: 'd1', prompt: 'Show the first diagonal.' },
  { id: 'show-prox-rca', segmentId: 'prox-rca', prompt: 'Show the proximal RCA.' },
  { id: 'show-mid-rca', segmentId: 'mid-rca', prompt: 'Show the mid RCA at full length.' },
  { id: 'show-dist-rca', segmentId: 'dist-rca', prompt: 'Show the crux and distal RCA.' },
  { id: 'show-pda', segmentId: 'pda', prompt: 'Show the PDA.' },
]

export interface ShowMeResult {
  score: number
  rating: SegmentRating
  passed: boolean
  ideal: boolean
  best: { raoLao: number; cranialCaudal: number; score: number }
}

export const PASS_SCORE = 1.5
export const IDEAL_SCORE = 2.5

const bestViewCache = new Map<string, ShowMeResult['best']>()

/** Highest-scoring view on a 5° grid; raoLao in the outer loop, first maximum kept. */
function bestView(segmentId: string): ShowMeResult['best'] {
  const cached = bestViewCache.get(segmentId)
  if (cached) return cached
  let best = { raoLao: -90, cranialCaudal: -45, score: -Infinity }
  for (let raoLao = -90; raoLao <= 90; raoLao += 5) {
    for (let cranialCaudal = -45; cranialCaudal <= 45; cranialCaudal += 5) {
      const score = interpolateSegmentScore(segmentId, raoLao, cranialCaudal)
      if (score > best.score) best = { raoLao, cranialCaudal, score }
    }
  }
  bestViewCache.set(segmentId, best)
  return best
}

export function scoreShowMe(segmentId: string, raoLao: number, cranialCaudal: number): ShowMeResult {
  const score = interpolateSegmentScore(segmentId, raoLao, cranialCaudal)
  return {
    score,
    rating: scoreToRating(score),
    passed: score >= PASS_SCORE,
    ideal: score >= IDEAL_SCORE,
    best: bestView(segmentId),
  }
}

/** Scores this close to the best count as the best view (the best is found on a 5° grid). */
const AT_BEST = 0.05

/** Feedback after a shot, as the learner reads it. */
export function showMeVerdict(result: ShowMeResult): string {
  if (result.ideal) return 'Ideal view. This is a textbook projection for this segment.'
  if (result.passed && result.score >= result.best.score - AT_BEST) {
    return 'Passed. No standard view shows this segment better.'
  }
  if (result.passed) return 'Passed. The segment can be judged here, but a better view exists.'
  return 'Not passed. The segment is foreshortened or hidden by overlap here.'
}
