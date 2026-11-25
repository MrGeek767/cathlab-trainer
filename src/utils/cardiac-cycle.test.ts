import { describe, it, expect } from 'vitest'
import {
  beatPeriodMs,
  cardiacPhase,
  contractionAt,
  flowTimeMs,
  cineFrameTime,
  clockTimeForFlowMs,
  ecgAt,
  CINE_FRAME_MS,
  SYSTOLE_FRACTION,
  CORONARY_SYSTOLIC_DAMPING,
} from './cardiac-cycle'

const HR = 70
const period = beatPeriodMs(HR)
const atPhase = (phase: number, beat = 0) => (beat + phase) * period

describe('the beat', () => {
  it('lasts 60 000 / heart rate milliseconds', () => {
    expect(beatPeriodMs(60)).toBeCloseTo(1000, 6)
    expect(period).toBeCloseTo(857.142857, 4)
    expect(cardiacPhase(atPhase(0.25, 3), HR)).toBeCloseTo(0.25, 6)
  })
})

describe('contractionAt: how far the heart has squeezed (0 relaxed, 1 end-systole)', () => {
  it('starts each beat relaxed at the R wave and peaks at end-systole', () => {
    expect(contractionAt(atPhase(0), HR)).toBeCloseTo(0, 6)
    expect(contractionAt(atPhase(SYSTOLE_FRACTION), HR)).toBeCloseTo(1, 6)
  })

  it('rises through systole and is relaxed again by mid-diastole', () => {
    let previous = -1
    for (let p = 0; p <= SYSTOLE_FRACTION; p += SYSTOLE_FRACTION / 20) {
      const c = contractionAt(atPhase(p), HR)
      expect(c).toBeGreaterThanOrEqual(previous)
      previous = c
    }
    expect(contractionAt(atPhase(0.75), HR)).toBeCloseTo(0, 6)
  })

  it('stays between 0 and 1 and repeats every beat', () => {
    for (let t = 0; t < 3 * period; t += 17) {
      const c = contractionAt(t, HR)
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
      expect(contractionAt(t + period, HR)).toBeCloseTo(c, 6)
    }
  })
})

describe('flowTimeMs: contrast advances with coronary flow, mostly in diastole', () => {
  it('keeps whole beats whole, so a run lasts as many beats as planned', () => {
    for (const damping of [CORONARY_SYSTOLIC_DAMPING.left, CORONARY_SYSTOLIC_DAMPING.right]) {
      expect(flowTimeMs(atPhase(0, 3), HR, damping)).toBeCloseTo(3 * period, 3)
    }
  })

  it('never runs backwards', () => {
    let previous = -1
    for (let t = 0; t < 2 * period; t += 5) {
      const f = flowTimeMs(t, HR, CORONARY_SYSTOLIC_DAMPING.left)
      expect(f).toBeGreaterThan(previous)
      previous = f
    }
  })

  it('advances less during systole, more so on the left than the right', () => {
    const systole = atPhase(SYSTOLE_FRACTION)
    const left = flowTimeMs(systole, HR, CORONARY_SYSTOLIC_DAMPING.left)
    const right = flowTimeMs(systole, HR, CORONARY_SYSTOLIC_DAMPING.right)
    expect(left).toBeLessThan(right)
    expect(right).toBeLessThan(systole)
  })
})

describe('cine frames', () => {
  it('step at 15 frames a second', () => {
    expect(CINE_FRAME_MS).toBeCloseTo(1000 / 15, 9)
    expect(cineFrameTime(66.6)).toBe(0)
    expect(cineFrameTime(70)).toBeCloseTo(66.6667, 3)
    expect(cineFrameTime(1000)).toBeCloseTo(1000, 6)
  })
})

describe('ecgAt: the monitor trace', () => {
  it('peaks at the R wave and returns to baseline in diastole', () => {
    const r = ecgAt(0)
    for (let p = 0.02; p < 1; p += 0.01) expect(ecgAt(p)).toBeLessThan(r)
    expect(Math.abs(ecgAt(0.6))).toBeLessThan(0.02)
  })

  it('has a T wave at the end of systole and a P wave before the next beat', () => {
    expect(ecgAt(SYSTOLE_FRACTION - 0.07)).toBeGreaterThan(0.15)
    expect(ecgAt(0.88)).toBeGreaterThan(0.08)
  })
})

describe('clockTimeForFlowMs: how long a stretch of flow takes on the clock', () => {
  it('is exact for whole beats', () => {
    expect(clockTimeForFlowMs(0, 3 * period, HR, CORONARY_SYSTOLIC_DAMPING.left)).toBeCloseTo(3 * period, 3)
  })

  it('inverts flowTimeMs from any starting point in the beat', () => {
    const damping = CORONARY_SYSTOLIC_DAMPING.left
    for (const start of [0, 123, 400, 777]) {
      const clock = clockTimeForFlowMs(start, 2.3 * period, HR, damping)
      expect(flowTimeMs(start + clock, HR, damping) - flowTimeMs(start, HR, damping)).toBeCloseTo(2.3 * period, 2)
    }
  })
})

