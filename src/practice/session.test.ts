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
    s = inflateAt(s, 'nc-3.25x12', 20, 10)
    expect(s.step).toBe('final')
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
