import { describe, it, expect } from 'vitest'
import { summarizeSession, buildRun, readBest, SESSION_LENGTH, type ChallengeAttempt } from './session'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { applyAnatomy } from '@/data/segment-sizes'

/** Small seeded generator, so every run sees the same items. */
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

const SEGMENTS = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')

describe('session summary', () => {
  it('an empty session scores 0%', () => {
    expect(summarizeSession([])).toEqual({
      total: 0,
      correct: 0,
      percent: 0,
      byKind: { 'show-me': { total: 0, correct: 0 }, 'name-segment': { total: 0, correct: 0 } },
    })
  })

  it('mixed attempts are counted per kind', () => {
    const attempts: ChallengeAttempt[] = [
      { kind: 'show-me', itemId: 'a', correct: true },
      { kind: 'show-me', itemId: 'b', correct: true },
      { kind: 'show-me', itemId: 'c', correct: false },
      { kind: 'name-segment', itemId: 'd', correct: true },
      { kind: 'name-segment', itemId: 'e', correct: false },
    ]
    expect(summarizeSession(attempts)).toEqual({
      total: 5,
      correct: 3,
      percent: 60,
      byKind: { 'show-me': { total: 3, correct: 2 }, 'name-segment': { total: 2, correct: 1 } },
    })
  })
})

describe('runs', () => {
  it('a show-me run has ten different items', () => {
    const run = buildRun('show-me', SEGMENTS, mulberry32(1))
    expect(run).toHaveLength(SESSION_LENGTH)
    const ids = run.map(entry => (entry.kind === 'show-me' ? entry.item.id : ''))
    expect(new Set(ids).size).toBe(SESSION_LENGTH)
  })

  it('a name-the-segment run asks about ten different segments', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = buildRun('name-segment', SEGMENTS, mulberry32(seed))
      expect(run).toHaveLength(SESSION_LENGTH)
      const targets = run.map(entry => (entry.kind === 'name-segment' ? entry.question.segmentId : ''))
      expect(new Set(targets).size, `seed ${seed}`).toBe(SESSION_LENGTH)
    }
  })

  it('a stored best that is missing or malformed reads as zero', () => {
    expect(readBest(null)).toEqual({ 'show-me': 0, 'name-segment': 0 })
    expect(readBest('80')).toEqual({ 'show-me': 0, 'name-segment': 0 })
    expect(readBest({ 'show-me': 80, 'name-segment': 'x' })).toEqual({ 'show-me': 80, 'name-segment': 0 })
  })
})
