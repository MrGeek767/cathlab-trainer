import type { ArterySegment } from '@/types/anatomy'
import { shuffle } from '@/utils/shuffle'
import { SHOW_ME_ITEMS, type ShowMeItem } from './show-me'
import { buildNameSegmentQuestion, type NameSegmentQuestion } from './name-segment'

export type ChallengeMode = 'learner' | 'exam'
export type ChallengeKind = 'show-me' | 'name-segment'
export const CHALLENGE_KINDS: readonly ChallengeKind[] = ['show-me', 'name-segment']

export interface ChallengeAttempt {
  kind: ChallengeKind
  itemId: string
  correct: boolean
}

export interface SessionSummary {
  total: number
  correct: number
  percent: number
  byKind: Record<ChallengeKind, { total: number; correct: number }>
}

export const SESSION_LENGTH = 10

/** Best exam percent per kind, kept in browser storage. */
export const BEST_KEY = 'cathlab-trainer:v1:best'

export function summarizeSession(attempts: ChallengeAttempt[]): SessionSummary {
  const byKind: SessionSummary['byKind'] = {
    'show-me': { total: 0, correct: 0 },
    'name-segment': { total: 0, correct: 0 },
  }
  let correct = 0
  for (const attempt of attempts) {
    byKind[attempt.kind].total += 1
    if (attempt.correct) {
      byKind[attempt.kind].correct += 1
      correct += 1
    }
  }
  const total = attempts.length
  return { total, correct, percent: total > 0 ? Math.round((correct / total) * 100) : 0, byKind }
}

export type RunItem =
  | { kind: 'show-me'; item: ShowMeItem }
  | { kind: 'name-segment'; question: NameSegmentQuestion }

/** Tries per question before a run accepts a repeated target. */
const DISTINCT_TRIES = 50

/**
 * The items for one run. Show me takes its items in random order; Name the segment
 * asks about a different segment each time while there are enough segments.
 */
export function buildRun(
  kind: ChallengeKind,
  segments: ArterySegment[],
  rng: () => number,
  length: number = SESSION_LENGTH,
): RunItem[] {
  if (kind === 'show-me') {
    return shuffle(SHOW_ME_ITEMS, rng)
      .slice(0, length)
      .map(item => ({ kind: 'show-me' as const, item }))
  }
  const run: RunItem[] = []
  const asked = new Set<string>()
  while (run.length < length) {
    let question = buildNameSegmentQuestion(segments, rng)
    for (let tries = 1; asked.has(question.segmentId) && tries < DISTINCT_TRIES; tries++) {
      question = buildNameSegmentQuestion(segments, rng)
    }
    asked.add(question.segmentId)
    run.push({ kind: 'name-segment', question })
  }
  return run
}

/** Reads the stored bests, treating anything missing or malformed as 0. */
export function readBest(stored: unknown): Record<ChallengeKind, number> {
  const best: Record<ChallengeKind, number> = { 'show-me': 0, 'name-segment': 0 }
  if (stored && typeof stored === 'object') {
    for (const kind of CHALLENGE_KINDS) {
      const value = (stored as Record<string, unknown>)[kind]
      if (typeof value === 'number' && Number.isFinite(value)) best[kind] = Math.min(100, Math.max(0, value))
    }
  }
  return best
}
