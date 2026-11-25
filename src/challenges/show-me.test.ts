import { describe, it, expect } from 'vitest'
import { scoreShowMe, SHOW_ME_ITEMS } from './show-me'

describe('scoreShowMe', () => {
  it('AP cranial is ideal for the mid LAD', () => {
    const result = scoreShowMe('mid-lad', 0, 35)
    expect(result.rating).toBe('+++')
    expect(result.passed).toBe(true)
    expect(result.ideal).toBe(true)
  })

  it('the spider view fails the mid LAD', () => {
    expect(scoreShowMe('mid-lad', 45, -30).passed).toBe(false)
  })

  it('RAO caudal is ideal for the distal LAD', () => {
    expect(scoreShowMe('dist-lad', -25, -25).rating).toBe('+++')
  })

  it('LAO cranial passes the PDA', () => {
    expect(scoreShowMe('pda', 25, 25).passed).toBe(true)
  })

  it('best view for the mid LAD is cranial', () => {
    expect(scoreShowMe('mid-lad', 0, 0).best.cranialCaudal).toBeGreaterThan(0)
  })

  it('best view for the LM is ideal', () => {
    expect(scoreShowMe('lm', 0, 0).best.score).toBeGreaterThanOrEqual(2.5)
  })

  it('scores stay finite at extreme angles', () => {
    for (const raoLao of [-90, 90]) {
      for (const cranialCaudal of [-45, 45]) {
        const result = scoreShowMe('mid-lad', raoLao, cranialCaudal)
        expect(Number.isFinite(result.score)).toBe(true)
        expect(Number.isFinite(result.best.score)).toBe(true)
      }
    }
  })

  it('every challenge can be passed from its best view', () => {
    for (const item of SHOW_ME_ITEMS) {
      const { best } = scoreShowMe(item.segmentId, 0, 0)
      expect(scoreShowMe(item.segmentId, best.raoLao, best.cranialCaudal).passed, item.id).toBe(true)
    }
  })
})
