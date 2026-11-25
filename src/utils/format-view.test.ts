import { describe, it, expect } from 'vitest'
import { formatView } from './format-view'

describe('formatView', () => {
  it('names a straight AP view', () => {
    expect(formatView(0, 0)).toBe('AP / Straight')
  })

  it('names an LAO caudal view the way the monitor does', () => {
    expect(formatView(45, -30)).toBe('LAO 45 / CAUD 30')
  })

  it('names an RAO cranial view', () => {
    expect(formatView(-15, 30)).toBe('RAO 15 / CRAN 30')
  })

  it('treats angles under one degree as zero', () => {
    expect(formatView(0.4, -0.6)).toBe('AP / Straight')
  })
})
