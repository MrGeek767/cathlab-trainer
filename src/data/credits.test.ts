import { describe, it, expect } from 'vitest'
import { CREDITS, REFERENCES, DISCLAIMER, SIMPLIFICATIONS, NON_AFFILIATION } from './credits'

describe('credits', () => {
  it('every credit is complete and links over https', () => {
    for (const credit of CREDITS) {
      expect(credit.item.trim(), credit.item).not.toBe('')
      expect(credit.author.trim(), credit.item).not.toBe('')
      expect(credit.licence.trim(), credit.item).not.toBe('')
      expect(credit.url.startsWith('https://'), credit.item).toBe(true)
    }
  })

  it('the two required credits are present', () => {
    const items = CREDITS.map(c => c.item)
    expect(items.some(item => item.includes('iiviewer'))).toBe(true)
    expect(items.some(item => item.includes('Realistic Human Heart'))).toBe(true)
  })

  it('every reference links over https', () => {
    expect(REFERENCES.length).toBeGreaterThan(0)
    for (const reference of REFERENCES) {
      expect(reference.label.trim()).not.toBe('')
      expect(reference.url.startsWith('https://'), reference.label).toBe(true)
    }
  })

  it('the disclaimer text is exact', () => {
    expect(DISCLAIMER).toBe('Educational simulation, not for clinical use.')
  })

  it('the About text says the game is not affiliated with AngioView', () => {
    expect(NON_AFFILIATION).toMatch(/not affiliated with AngioView/)
  })

  it('the simplifications are listed', () => {
    expect(SIMPLIFICATIONS).toHaveLength(4)
  })

  it('the simplifications cover the simulated motion, flow and catheter, so learners know what is modelled', () => {
    const text = SIMPLIFICATIONS.join(' ')
    expect(text).toMatch(/heart motion/i)
    expect(text).toMatch(/contrast/i)
    expect(text).toMatch(/catheter/i)
    expect(text).toMatch(/breath/i)
  })
})

