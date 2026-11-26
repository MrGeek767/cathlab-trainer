import { describe, it, expect } from 'vitest'
import { injectionSideFor, labelsState, systemShown, vesselOpacity } from './monitor-state'

describe('vesselOpacity: which arteries the monitor shows', () => {
  const run = new Map([['lm', { from: 0, to: 1 }]])

  it('road map: every artery when no run is playing', () => {
    expect(vesselOpacity(false, null)).toBeNull()
  })

  it('real fluoro: no arteries until contrast flows', () => {
    const shown = vesselOpacity(true, null)
    expect(shown).not.toBeNull()
    expect(shown!.size).toBe(0)
  })

  it('a contrast run shows what holds contrast, in either mode', () => {
    expect(vesselOpacity(false, run)).toBe(run)
    expect(vesselOpacity(true, run)).toBe(run)
  })
})

describe('injectionSideFor: which coronary a run injects', () => {
  it("is the question's own side while a real-fluoro question loops, whatever the learner picked", () => {
    expect(injectionSideFor('left', 'right')).toBe('left')
    expect(injectionSideFor('right', 'left')).toBe('right')
  })

  it("is the learner's pick otherwise, and comes back to it after the question", () => {
    expect(injectionSideFor(null, 'right')).toBe('right')
  })
})

describe('systemShown: which coronary the monitor draws', () => {
  it("follows Explore's arteries filter between runs", () => {
    expect(systemShown(true, 'left', false)).toBe('left')
  })

  it('steps aside during a run, so injecting the other coronary still shows it', () => {
    expect(systemShown(true, 'left', true)).toBe('both')
  })

  it('is both coronaries outside Explore', () => {
    expect(systemShown(false, 'left', false)).toBe('both')
  })
})

describe('labelsState: segment names on the monitor, and what the Labels switch shows', () => {
  const base = { learn: false, question: false, exam: false, chosen: false }

  it("follows the learner's switch while exploring", () => {
    expect(labelsState({ ...base, chosen: true })).toEqual({ on: true, lock: null })
    expect(labelsState(base)).toEqual({ on: false, lock: null })
  })

  it('is on and locked in Learn, which always names the segments', () => {
    expect(labelsState({ ...base, learn: true })).toEqual({ on: true, lock: expect.any(String) })
  })

  it('is off and locked while a question is on screen, so the name cannot leak', () => {
    expect(labelsState({ ...base, question: true, chosen: true })).toEqual({ on: false, lock: expect.any(String) })
  })

  it('is off and locked for the whole of an exam, hover names included', () => {
    const exam = labelsState({ ...base, exam: true, chosen: true })
    expect(exam.on).toBe(false)
    expect(exam.lock).toMatch(/exam/i)
  })
})

