import { describe, it, expect } from 'vitest'
import { CREDITS, REFERENCES, DISCLAIMER, SIMPLIFICATIONS, CREATOR } from './credits'

describe('credits', () => {
  it('every credit is complete and links over https', () => {
    for (const credit of CREDITS) {
      expect(credit.role.trim(), credit.item).not.toBe('')
      expect(credit.item.trim(), credit.item).not.toBe('')
      expect(credit.author.trim(), credit.item).not.toBe('')
      expect(credit.url.startsWith('https://'), credit.item).toBe(true)
    }
  })

  it('every openly licensed work names its licence (the base code is used by permission instead)', () => {
    for (const credit of CREDITS.filter(c => c.role !== 'Base code')) {
      expect(credit.licence?.trim(), credit.item).toBeTruthy()
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

  it('credits the base code by name, as base code', () => {
    const base = CREDITS.find(c => c.item.startsWith('iiviewer'))!
    expect(base.role).toBe('Base code')
    expect(base.author).toBe('annasrahman.com')
  })

  it('credits the typefaces too', () => {
    expect(CREDITS.map(c => c.item).join(' ')).toMatch(/Atkinson Hyperlegible/)
    expect(CREDITS.map(c => c.item).join(' ')).toMatch(/Barlow Condensed/)
  })

  it('names its creator', () => {
    expect(CREATOR).toBe('Omar M. Noreldin')
  })

  it('never mentions another product it might be compared with, anywhere in the app or README', () => {
    // Every source file, plus the README, the credits file and the page shell, as text.
    const texts = {
      ...import.meta.glob(['/src/**/*.{ts,tsx,css}', '!/src/data/credits.test.ts'], { query: '?raw', import: 'default', eager: true }),
      ...import.meta.glob(['/README.md', '/CREDITS.md', '/index.html'], { query: '?raw', import: 'default', eager: true }),
    } as Record<string, string>
    expect(Object.keys(texts).length).toBeGreaterThan(50)
    const named = Object.entries(texts)
      .filter(([, text]) => /angio\s*view/i.test(text))
      .map(([file]) => file)
    expect(named).toEqual([])
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

