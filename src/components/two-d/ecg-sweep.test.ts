import { describe, it, expect } from 'vitest'
import { sweepSamples } from './ecg-sweep'
import { beatPeriodMs, ecgAt, cardiacPhase } from '@/utils/cardiac-cycle'

const HR = 70
const WINDOW = 3000
const COLUMNS = 300

describe('sweepSamples: a monitor-style ECG sweep', () => {
  it('writes the newest value at the sweep head', () => {
    const now = 2 * beatPeriodMs(HR) // an R wave
    const samples = sweepSamples(now, WINDOW, COLUMNS, HR)
    const head = Math.floor(((now % WINDOW) / WINDOW) * COLUMNS)
    expect(samples[head]).toBeCloseTo(ecgAt(0), 2)
  })

  it('leaves a short erased gap just ahead of the head', () => {
    const now = 1234
    const samples = sweepSamples(now, WINDOW, COLUMNS, HR)
    const head = Math.floor(((now % WINDOW) / WINDOW) * COLUMNS)
    expect(samples[(head + 3) % COLUMNS]).toBeNull()
    expect(samples[(head - 3 + COLUMNS) % COLUMNS]).not.toBeNull()
  })

  it('shows older beats further behind the head, wrapping around the screen', () => {
    const now = 2500
    const samples = sweepSamples(now, WINDOW, COLUMNS, HR)
    const head = Math.floor(((now % WINDOW) / WINDOW) * COLUMNS)
    const behind = (head - 100 + COLUMNS) % COLUMNS // one third of the window earlier
    expect(samples[behind]).toBeCloseTo(ecgAt(cardiacPhase(now - WINDOW / 3, HR)), 1)
  })
})

describe('sweepSamples on a narrow trace', () => {
  it('draws every R wave at full height, however the beats fall between columns', () => {
    const period = beatPeriodMs(HR)
    for (const now of [1000, 1003, 1007, 1011, 1500]) {
      const samples = sweepSamples(now, WINDOW, 240, HR) // 12.5 ms per column
      // Local maxima above half height: one per R wave. The screen's two edges are left
      // out, since a beat that wraps from the right edge to the left is split there.
      const peaks = samples.filter(
        (v, x): v is number =>
          x > 0 && x < samples.length - 1 && v !== null && v > 0.5 && v >= samples[x - 1]! && v >= samples[x + 1]!,
      )
      expect(peaks.length, `at ${now}`).toBeGreaterThanOrEqual(Math.floor(WINDOW / period) - 1)
      for (const peak of peaks) expect(peak).toBeGreaterThan(0.85)
    }
  })
})
