import { describe, it, expect } from 'vitest'
import { GRADE_LABEL, PRACTICE_REFERENCES, worseGrade } from './grades'

describe('grades', () => {
  it('orders grades from best to unsafe', () => {
    expect(worseGrade('best', 'acceptable')).toBe('acceptable')
    expect(worseGrade('acceptable', 'best')).toBe('acceptable')
    expect(worseGrade('unsafe', 'not-suitable')).toBe('unsafe')
    expect(worseGrade('not-suitable', 'acceptable')).toBe('not-suitable')
  })

  it('labels the four grades in sentence case', () => {
    expect(Object.values(GRADE_LABEL)).toEqual(['Best', 'Acceptable', 'Not suitable', 'Unsafe'])
  })

  it('every reference with a link uses https', () => {
    for (const reference of Object.values(PRACTICE_REFERENCES)) {
      expect(reference.label.trim()).not.toBe('')
      if (reference.url !== null) expect(reference.url.startsWith('https://'), reference.label).toBe(true)
    }
  })
})
