import { describe, it, expect } from 'vitest'
import { vesselOpacity } from './monitor-state'

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
