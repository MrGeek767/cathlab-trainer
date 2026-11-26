import { describe, it, expect } from 'vitest'
import { BALLOONS, STENTS, deviceById } from '@/data/devices'
import { gradePick, type PracticeStep } from './sizing'

const ctx = (step: PracticeStep) => ({ proximalRefMm: 3.2, distalRefMm: 3.1, lesionLengthMm: 12, stentDiameterMm: step === 'postdilate' ? 3 : null })

describe('gradePick: sizing the practice devices', () => {
  it.each([
    ['predilate', 'sc-2.50x15', 'best'],
    ['predilate', 'nc-3.00x12', 'best'],
    ['predilate', 'sc-3.50x15', 'unsafe'],
    ['predilate', 'sc-2.00x15', 'acceptable'],
    ['predilate', 'des-3.00x18', 'acceptable'],
    ['stent', 'des-3.00x18', 'best'],
    ['stent', 'des-3.25x18', 'best'],
    ['stent', 'des-2.75x18', 'acceptable'],
    ['stent', 'des-3.50x18', 'not-suitable'],
    ['stent', 'des-3.00x15', 'not-suitable'],
    ['stent', 'des-3.00x23', 'acceptable'],
    ['stent', 'des-3.00x28', 'not-suitable'],
    ['postdilate', 'nc-3.25x12', 'best'],
    ['postdilate', 'sc-3.25x12', 'not-suitable'],
    ['postdilate', 'nc-3.75x12', 'not-suitable'],
    ['postdilate', 'nc-2.75x12', 'not-suitable'],
  ] as const)('%s with %s is %s', (step, id, grade) => {
    expect(gradePick(step, deviceById(id)!, ctx(step)).grade).toBe(grade)
  })

  it('every graded note names its reference and says why', () => {
    for (const step of ['predilate', 'stent', 'postdilate'] as const) {
      for (const device of [...BALLOONS, ...STENTS]) {
        const note = gradePick(step, device, ctx(step))
        if (note.grade !== null) expect(note.reference, `${step} ${device.id}`).not.toBeNull()
        expect(note.text.trim(), `${step} ${device.id}`).not.toBe('')
      }
    }
  })
})
