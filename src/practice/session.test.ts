import { describe, it, expect } from 'vitest'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { buildVesselPaths } from '@/utils/vessel-paths'
import { MM_TO_SCENE } from '@/utils/geometry'
import { deviceById } from '@/data/devices'
import { pressureFor } from './compliance'
import { PRACTICE_LESION } from './lesion'
import { LAD_RAIL, buildRail } from './rail'
import { MAX_ATM, WIRE_MARGIN_MM, initialPractice, practiceReducer, type PracticeAction, type PracticeContext, type PracticeState } from './session'

const segments = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')
const paths = buildVesselPaths(segments)
const rail = buildRail(LAD_RAIL, paths)
const ctx: PracticeContext = {
  rail,
  segment: segments.find(s => s.id === 'prox-lad')!,
  segmentLengthMm: paths.get('prox-lad')!.getLength() / MM_TO_SCENE,
  lesion: PRACTICE_LESION,
  guideTipMm: 2,
  wireTipMm: rail.lengthMm - 20,
  proximalRefMm: 3.2,
  distalRefMm: 3.1,
}
const reduce = practiceReducer(ctx)
const run = (actions: PracticeAction[], from: PracticeState = initialPractice(ctx)) => actions.reduce(reduce, from)
const pick = (id: string): PracticeAction => ({ type: 'pick', device: deviceById(id)! })
/** Move the device's tip to `segmentMm` along the proximal LAD. */
const tipTo = (state: PracticeState, segmentMm: number): PracticeAction => ({
  type: 'move',
  deltaMm: rail.startOf('prox-lad') + segmentMm - state.tipMm,
})
const step = (state: PracticeState, action: PracticeAction | ((s: PracticeState) => PracticeAction)) =>
  reduce(state, typeof action === 'function' ? action(state) : action)
const lastNote = (state: PracticeState) => state.notes.at(-1)!

function inflateAt(state: PracticeState, id: string, tipSegmentMm: number, atm: number) {
  let s = step(state, pick(id))
  s = step(s, current => tipTo(current, tipSegmentMm))
  s = step(s, { type: 'inflate' })
  s = step(s, { type: 'set-pressure', atm })
  return step(s, { type: 'deflate' })
}

describe('the practice session', () => {
  it('walks the textbook path to a good result', () => {
    let s = inflateAt(initialPractice(ctx), 'sc-2.50x15', 20, 6)
    expect(s.step).toBe('stent')
    expect(s.vessel.predilated).toBe(true)
    s = inflateAt(s, 'des-3.00x18', 23, 13)
    expect(s.step).toBe('postdilate')
    expect(s.inHand).toBeNull()
    expect(s.vessel.stent).not.toBeNull()
    s = inflateAt(s, 'nc-3.25x12', 20, 16)
    expect(s.step).toBe('final')
    expect(s.notes.some(note => note.title === 'Off the operator’s target')).toBe(false)
    s = step(s, { type: 'final-shot' })
    expect(s.step).toBe('done')
    expect(lastNote(s).grade).toBe('best')
  })

  it('never moves past the wire tip, back into the guide, or while inflated', () => {
    let s = run([pick('sc-2.50x15'), { type: 'move', deltaMm: -50 }])
    expect(s.tipMm).toBe(ctx.guideTipMm)
    s = step(s, { type: 'move', deltaMm: 1000 })
    expect(s.tipMm).toBeCloseTo(ctx.wireTipMm - WIRE_MARGIN_MM, 6)
    s = step(s, current => tipTo(current, 20))
    s = step(s, { type: 'inflate' })
    const before = s.tipMm
    s = step(s, { type: 'move', deltaMm: 5 })
    expect(s.tipMm).toBe(before)
    expect(run([{ type: 'move', deltaMm: 10 }]).tipMm).toBe(initialPractice(ctx).tipMm)
  })

  it('clamps pressure, ignores NaN, and holds at RBP until confirmed', () => {
    let s = run([pick('sc-2.50x15')])
    s = step(s, current => tipTo(current, 20))
    s = step(s, { type: 'inflate' })
    s = step(s, { type: 'set-pressure', atm: -3 })
    expect(s.inflation!.atm).toBe(0)
    s = step(s, { type: 'set-pressure', atm: 8 })
    s = step(s, { type: 'set-pressure', atm: Number.NaN })
    expect(s.inflation!.atm).toBe(8)
    s = step(s, { type: 'set-pressure', atm: 40 })
    expect(s.inflation!.atm).toBe(14)
    expect(s.inflation!.needsConfirm).toBe(true)
    s = step(s, { type: 'confirm-over-rbp' })
    expect(s.inflation!.needsConfirm).toBe(false)
    expect(lastNote(s).grade).toBe('unsafe')
    s = step(s, { type: 'set-pressure', atm: 40 })
    expect(s.inflation!.atm).toBe(MAX_ATM)
  })

  it('needs the device out of the guide before inflating', () => {
    const s = run([pick('sc-2.50x15'), { type: 'inflate' }])
    expect(s.inflation).toBeNull()
    expect(lastNote(s).grade).toBeNull()
  })

  it('refuses the final shot before a stent and a second stent after one', () => {
    expect(run([{ type: 'final-shot' }]).step).toBe('predilate')
    let s = run([{ type: 'skip' }])
    s = inflateAt(s, 'des-3.00x18', 23, 13)
    s = step(s, pick('des-3.00x18'))
    expect(s.inHand).toBeNull()
    expect(lastNote(s).grade).toBe('not-suitable')
  })

  it('calls the target the learner must read off the chart', () => {
    let s = run([{ type: 'skip' }, pick('des-3.00x18')])
    s = step(s, current => tipTo(current, 23))
    s = step(s, { type: 'inflate' })
    expect(s.call!.text).toBe('Deploy to 3.10 mm.')
    expect(s.call!.targetAtm).toBeCloseTo(pressureFor(deviceById('des-3.00x18')!, 3.1), 6)
    const predilation = step(step(run([pick('sc-2.50x15')]), current => tipTo(current, 20)), { type: 'inflate' })
    expect(predilation.call).toEqual({ text: 'Inflate to nominal pressure.', targetAtm: 6 })
  })

  it('grades the pressure used against the call', () => {
    const onTarget = inflateAt(run([{ type: 'skip' }]), 'des-3.00x18', 23, 13)
    expect(onTarget.notes.find(n => n.title === 'On the operator’s target')?.grade).toBe('best')
    const off = inflateAt(run([{ type: 'skip' }]), 'des-3.00x18', 23, 9)
    expect(off.notes.find(n => n.title === 'Off the operator’s target')?.grade).toBe('not-suitable')
  })

  it('direct stenting is allowed and graded acceptable', () => {
    const s = run([{ type: 'skip' }])
    expect(s.step).toBe('stent')
    expect(lastNote(s)).toMatchObject({ grade: 'acceptable', title: 'Direct stenting' })
  })

  it('starts again from the beginning', () => {
    const s = run([pick('sc-2.50x15'), { type: 'reset' }])
    expect(s).toEqual(initialPractice(ctx))
  })
})

describe('grading the mistakes Stage 1 teaches', () => {
  const finalNote = (state: PracticeState) => lastNote(step(state, { type: 'final-shot' }))

  it('grades the final shot at the lesion, so a stent that missed it is not a good result', () => {
    const s = inflateAt(run([{ type: 'skip' }]), 'des-3.00x18', 48, 13) // stent 30–48 mm, lesion 8–20 mm
    expect(s.notes.some(note => note.title === 'Stent missed the lesion')).toBe(true)
    const result = finalNote(s)
    expect(result.grade).toBe('not-suitable')
    expect(result.text).toMatch(/7\d% residual narrowing at the lesion/)
  })

  it('a stent over half the lesion leaves the rest narrowed at the final shot', () => {
    const s = inflateAt(run([{ type: 'skip' }]), 'des-3.00x18', 32, 13) // stent 14–32 mm
    expect(finalNote(s).grade).toBe('not-suitable')
  })

  it('a well-placed stent still earns a good result', () => {
    const s = inflateAt(inflateAt(initialPractice(ctx), 'sc-2.50x15', 20, 6), 'des-3.00x18', 23, 13)
    expect(finalNote(s)).toMatchObject({ grade: 'best' })
    expect(finalNote(s).text).toContain('at the lesion')
  })

  it('sizes a stent picked for direct stenting, as well as noting the direct stent', () => {
    const tooLong = run([pick('des-3.00x38')])
    expect(tooLong.notes.map(note => note.title)).toEqual(['Direct stenting', 'Stent not suitable'])
    expect(tooLong.notes[1]!.grade).toBe('not-suitable')
    const tooSmall = run([pick('des-2.50x18')])
    expect(tooSmall.notes[1]!.grade).toBe('not-suitable')
  })

  it('a balloon inflated beside the lesion says so, prepares nothing, and lets the learner try again', () => {
    const s = inflateAt(initialPractice(ctx), 'sc-2.50x15', 45, 6) // balloon 30–45 mm
    expect(s.notes.some(note => note.title === 'Missed the lesion' && note.grade === 'not-suitable')).toBe(true)
    expect(s.step).toBe('predilate')
    expect(s.vessel.predilated).toBe(false)
  })

  it('a post-dilation balloon outside the stent says so and leaves the step open', () => {
    let s = inflateAt(inflateAt(initialPractice(ctx), 'sc-2.50x15', 20, 6), 'des-3.00x18', 23, 13) // stent 5–23 mm
    s = inflateAt(s, 'nc-3.25x12', 45, 16) // balloon 33–45 mm
    expect(s.notes.some(note => note.title === 'Missed the stent' && note.grade === 'not-suitable')).toBe(true)
    expect(s.step).toBe('postdilate')
  })

  it('calls a high pressure for non-compliant post-dilation, as the lab does', () => {
    let s = inflateAt(inflateAt(initialPractice(ctx), 'sc-2.50x15', 20, 6), 'des-3.00x18', 23, 13)
    s = step(step(step(s, pick('nc-3.25x12')), current => tipTo(current, 20)), { type: 'inflate' })
    expect(s.call).toEqual({ text: 'Inflate to high pressure, 16 atm.', targetAtm: 16 })
  })

  it('after a geographic miss, explains the second stent instead of calling it unnecessary', () => {
    let s = inflateAt(run([{ type: 'skip' }]), 'des-3.00x18', 32, 13) // stent 14–32 mm
    expect(s.vessel.stent!.missedLesion).toBe(true)
    s = step(s, pick('des-3.00x18'))
    expect(s.inHand).toBeNull()
    expect(lastNote(s).grade).toBeNull()
    expect(lastNote(s).text).toMatch(/overlapping stent/)
    expect(lastNote(s).text).toMatch(/Start again/)
  })
})
