import type { ArterySegment } from '@/types/anatomy'
import type { Device } from '@/data/devices'
import { diameterAt, pressureFor } from './compliance'
import type { Note, Grade, ReferenceId } from './grades'
import { applyInflation, type Finding, type Vessel } from './inflation'
import { initialLumen, referenceAt, type Lumen, type PracticeLesion } from './lesion'
import type { Rail } from './rail'
import { gradePick, type PracticeStep } from './sizing'

/** Everything fixed for one practice: the course, the lesion and where guide and wire sit. */
export interface PracticeContext {
  rail: Rail
  segment: ArterySegment
  /** The lesion segment's drawn length. */
  segmentLengthMm: number
  lesion: PracticeLesion
  /** Where the seated guide's tip is on the rail. */
  guideTipMm: number
  /** Where the parked wire's tip is on the rail. */
  wireTipMm: number
  proximalRefMm: number
  distalRefMm: number
}

/** What the operator asks for before an inflation (design §7.4). */
export interface OperatorCall {
  text: string
  targetAtm: number
}

export interface InflationState {
  atm: number
  /** The highest pressure reached in this inflation; it decides the outcome. */
  peakAtm: number
  overRbpAllowed: boolean
  needsConfirm: boolean
}

export interface PracticeState {
  step: PracticeStep
  inHand: Device | null
  /** The distal end of the device in hand, in rail mm. */
  tipMm: number
  inflation: InflationState | null
  call: OperatorCall | null
  vessel: Vessel
  notes: Note[]
}

export type PracticeAction =
  | { type: 'pick'; device: Device }
  | { type: 'move'; deltaMm: number }
  | { type: 'inflate' }
  | { type: 'set-pressure'; atm: number }
  | { type: 'confirm-over-rbp' }
  | { type: 'deflate' }
  | { type: 'withdraw' }
  | { type: 'skip' }
  | { type: 'final-shot' }
  | { type: 'reset' }

export const MAX_ATM = 30
/** Non-compliant post-dilation is done at high pressure (design §7.4, §7.5); reviewers to set. */
export const POSTDILATION_ATM = 16
export const PRESSURE_TOLERANCE_ATM = 1
/** Keep this much wire beyond the device tip. */
export const WIRE_MARGIN_MM = 5
/** Below this the balloon never opened. */
const OPENING_ATM = 2

export function initialPractice(ctx: PracticeContext): PracticeState {
  return {
    step: 'predilate',
    inHand: null,
    tipMm: ctx.guideTipMm,
    inflation: null,
    call: null,
    vessel: { lumen: initialLumen(ctx.segment, ctx.segmentLengthMm, ctx.lesion), stent: null, predilated: false },
    notes: [],
  }
}

const mm2 = (value: number) => value.toFixed(2)
const atmText = (atm: number) => (Number.isInteger(atm) ? `${atm}` : atm.toFixed(1))

/** The operator's call for inflating `device` at `step`. */
export function operatorCall(device: Device, step: PracticeStep, ctx: PracticeContext): OperatorCall {
  const nominal = { atm: device.chart.nominalAtm, mm: device.diameterMm }
  const rbp = { atm: device.chart.rbpAtm, mm: diameterAt(device, device.chart.rbpAtm) }
  const aim = (want: number, verb: string): OperatorCall => {
    if (want <= nominal.mm + 1e-9) return { text: `${verb} at nominal pressure.`, targetAtm: nominal.atm }
    if (want >= rbp.mm - 1e-9) return { text: `${verb} to rated burst pressure.`, targetAtm: rbp.atm }
    const target = Math.round(want * 100) / 100
    return { text: `${verb} to ${mm2(target)} mm.`, targetAtm: pressureFor(device, target) }
  }
  if (device.category === 'stent') return aim(ctx.distalRefMm, 'Deploy')
  if ((step === 'postdilate' || step === 'final') && device.kind === 'non-compliant') {
    // The operator calls a pressure: a non-compliant balloon's chart is nearly flat, and high pressure is the point.
    const atm = Math.min(POSTDILATION_ATM, device.chart.rbpAtm)
    return { text: `Inflate to high pressure, ${atm} atm.`, targetAtm: atm }
  }
  if (step === 'postdilate' || step === 'final') return aim(ctx.proximalRefMm, 'Inflate')
  return { text: 'Inflate to nominal pressure.', targetAtm: nominal.atm }
}

function findingNote(finding: Finding): Omit<Note, 'key'> {
  switch (finding.kind) {
    case 'missed-lesion':
      return finding.by === 'stent'
        ? {
            grade: 'not-suitable',
            title: 'Stent missed the lesion',
            text: 'The stent sits on healthy vessel and the lesion is untreated. Before deploying, line the two markers up across the lesion with 2 mm to spare at each end.',
            reference: 'stllr-2008',
          }
        : {
            grade: 'not-suitable',
            title: 'Missed the lesion',
            text: 'The balloon was inflated beside the lesion, so the narrowing is unchanged. Line its two markers up on either side of the narrowing and inflate again.',
            reference: null,
          }
    case 'missed-stent':
      return {
        grade: 'not-suitable',
        title: 'Missed the stent',
        text: 'The balloon was inflated outside the stent it was meant to expand. Line its markers up inside the stent and inflate again.',
        reference: null,
      }
    case 'geographic-miss':
      return {
        grade: 'not-suitable',
        title: 'Geographic miss',
        text: `The stent leaves ${finding.uncoveredMm.toFixed(1)} mm of the lesion's landing zone uncovered. Diseased vessel left at a stent edge raises the risk of restenosis.`,
        reference: 'stllr-2008',
      }
    case 'edge-dissection-risk':
      return {
        grade: 'unsafe',
        title: 'Edge dissection risk',
        text: `At its edge the device is ${Math.round((finding.ratio - 1) * 100)}% wider than the vessel. Oversizing beyond the stent can tear the vessel wall.`,
        reference: 'sizing-review',
      }
    case 'residual-stenosis':
      return {
        grade: null,
        title: 'Stent under-expanded',
        text: `Its narrowest point is ${Math.round(finding.percentOfReference)}% of the vessel's size. Post-dilate with a non-compliant balloon at high pressure.`,
        reference: 'sizing-review',
      }
    case 'partial-cover':
      return {
        grade: null,
        title: 'Part of the lesion missed',
        text: `The balloon covered ${Math.round(finding.coveredFraction * 100)}% of the lesion. Line both markers up across the whole narrowing.`,
        reference: null,
      }
  }
}

/** The reducer for one practice session (plan Task 7). */
export function practiceReducer(ctx: PracticeContext) {
  const addNote = (state: PracticeState, note: Omit<Note, 'key'>): Note[] => [...state.notes, { ...note, key: `n${state.notes.length + 1}` }]
  const sizing = (state: PracticeState) => ({
    proximalRefMm: ctx.proximalRefMm,
    distalRefMm: ctx.distalRefMm,
    lesionLengthMm: ctx.lesion.lengthMm,
    stentDiameterMm: state.vessel.stent?.nominalDiameterMm ?? null,
  })

  return function reduce(state: PracticeState, action: PracticeAction): PracticeState {
    switch (action.type) {
      case 'pick': {
        if (state.inflation) return state
        const { device } = action
        if (device.category === 'stent' && state.vessel.stent) {
          return {
            ...state,
            notes: addNote(
              state,
              state.vessel.stent.missedLesion
                ? {
                    // In the lab a miss is covered with another stent; this practice keeps to one.
                    grade: null,
                    title: 'One stent in this practice',
                    text: 'In the lab, a second, overlapping stent would cover the part the first one missed. This practice places one stent. Start again to retry the placement.',
                    reference: 'stllr-2008',
                  }
                : {
                    grade: 'not-suitable',
                    title: 'One stent covers this lesion',
                    text: 'A second stent is not needed for a focal lesion. Post-dilate the stent you placed instead.',
                    reference: 'sizing-review',
                  },
            ),
          }
        }
        let notes = addNote(state, gradePick(state.step, device, sizing(state)))
        // A stent picked for direct stenting is sized as well.
        if (device.category === 'stent' && state.step === 'predilate') {
          notes = [...notes, { ...gradePick('stent', device, sizing(state)), key: `n${notes.length + 1}` }]
        }
        const step = device.category === 'stent' && state.step === 'predilate' ? 'stent' : state.step
        return { ...state, step, inHand: device, tipMm: ctx.guideTipMm, call: null, notes }
      }

      case 'move': {
        if (!state.inHand || state.inflation || !Number.isFinite(action.deltaMm)) return state
        const tipMm = Math.min(Math.max(state.tipMm + action.deltaMm, ctx.guideTipMm), ctx.wireTipMm - WIRE_MARGIN_MM)
        return tipMm === state.tipMm ? state : { ...state, tipMm }
      }

      case 'inflate': {
        if (!state.inHand || state.inflation) return state
        if (state.tipMm - state.inHand.lengthMm < ctx.guideTipMm - 1e-9) {
          return {
            ...state,
            notes: addNote(state, {
              grade: null,
              title: 'Still in the guide',
              text: 'Advance it out of the guide and onto the lesion before inflating.',
              reference: null,
            }),
          }
        }
        return {
          ...state,
          inflation: { atm: 0, peakAtm: 0, overRbpAllowed: false, needsConfirm: false },
          call: operatorCall(state.inHand, state.step, ctx),
        }
      }

      case 'set-pressure': {
        const { inflation, inHand } = state
        if (!inflation || !inHand || !Number.isFinite(action.atm)) return state
        let atm = Math.min(Math.max(action.atm, 0), MAX_ATM)
        let needsConfirm = false
        if (atm > inHand.chart.rbpAtm && !inflation.overRbpAllowed) {
          atm = inHand.chart.rbpAtm
          needsConfirm = true
        }
        return { ...state, inflation: { ...inflation, atm, needsConfirm, peakAtm: Math.max(inflation.peakAtm, atm) } }
      }

      case 'confirm-over-rbp': {
        if (!state.inflation) return state
        return {
          ...state,
          inflation: { ...state.inflation, overRbpAllowed: true, needsConfirm: false },
          notes: addNote(state, {
            grade: 'unsafe',
            title: 'Past rated burst pressure',
            text: 'Above RBP the balloon can rupture and tear the vessel. Stay at or below RBP and use a bigger non-compliant balloon if you need more.',
            reference: 'charts',
          }),
        }
      }

      case 'deflate': {
        const { inflation, inHand, call } = state
        if (!inflation || !inHand) return state
        const peak = inflation.peakAtm
        const base = { ...state, inflation: null, call: null }
        if (peak < OPENING_ATM) {
          return {
            ...base,
            notes: addNote(state, { grade: null, title: 'It never opened', text: 'Raise the pressure until the device opens.', reference: null }),
          }
        }
        const segStart = ctx.rail.startOf(ctx.lesion.segmentId)
        const span = { startMm: state.tipMm - inHand.lengthMm - segStart, endMm: state.tipMm - segStart }
        const result = applyInflation(state.vessel, inHand, span, peak, ctx.segment, ctx.segmentLengthMm, ctx.lesion)

        let notes = state.notes
        const push = (note: Omit<Note, 'key'>) => {
          notes = [...notes, { ...note, key: `n${notes.length + 1}` }]
        }
        if (call) {
          const reached = `At ${atmText(peak)} atm the chart gives ${mm2(diameterAt(inHand, peak))} mm.`
          push(
            Math.abs(peak - call.targetAtm) <= PRESSURE_TOLERANCE_ATM
              ? { grade: 'best', title: 'On the operator’s target', text: reached, reference: 'charts' }
              : { grade: 'not-suitable', title: 'Off the operator’s target', text: `The call was: ${call.text} ${reached}`, reference: 'charts' },
          )
        }
        result.findings.forEach(finding => push(findingNote(finding)))

        // A balloon that missed what it was meant for leaves the step open, to try again.
        const missed = result.findings.some(f => (f.kind === 'missed-lesion' && f.by === 'balloon') || f.kind === 'missed-stent')
        let step = state.step
        if (inHand.category === 'stent') step = 'postdilate'
        else if (!missed && step === 'predilate') step = 'stent'
        else if (!missed && step === 'postdilate') step = 'final'
        return { ...base, step, vessel: result.vessel, notes, inHand: inHand.category === 'stent' ? null : inHand }
      }

      case 'withdraw':
        return state.inflation || !state.inHand ? state : { ...state, inHand: null, tipMm: ctx.guideTipMm }

      case 'skip': {
        if (state.inflation) return state
        if (state.step === 'predilate') {
          return {
            ...state,
            step: 'stent',
            notes: addNote(state, {
              grade: 'acceptable',
              title: 'Direct stenting',
              text: 'Stenting without predilation is accepted for a focal, non-calcified lesion, but the stent may expand less.',
              reference: 'cit-2024',
            }),
          }
        }
        return state.step === 'postdilate' ? { ...state, step: 'final' } : state
      }

      case 'final-shot': {
        const stent = state.vessel.stent
        if (state.inflation || !stent || (state.step !== 'postdilate' && state.step !== 'final')) return state
        // The final angiogram is judged where it matters: across the lesion and the stent, so a
        // stent beside the lesion leaves the narrowing in view.
        const lesionEnd = ctx.lesion.startMm + ctx.lesion.lengthMm
        const worst = tightestShare(
          state.vessel.lumen,
          Math.min(ctx.lesion.startMm, stent.startMm),
          Math.max(lesionEnd, stent.endMm),
          mm => referenceAt(ctx.segment, ctx.segmentLengthMm, mm),
        )
        const residual = 1 - worst.share
        const percent = Math.max(0, Math.round(residual * 100))
        const [grade, title]: [Grade, string] =
          residual <= 0.1 ? ['best', 'Good result'] : residual <= 0.2 ? ['acceptable', 'Acceptable result'] : ['not-suitable', 'Residual narrowing']
        const inStent = worst.mm >= stent.startMm - 1e-9 && worst.mm <= stent.endMm + 1e-9
        const advice = residual <= 0.2 ? '' : inStent ? ' Post-dilate with a non-compliant balloon at high pressure.' : ' Part of the lesion was left without a stent.'
        const reference: ReferenceId = inStent ? 'sizing-review' : 'stllr-2008'
        return {
          ...state,
          step: 'done',
          inHand: null,
          tipMm: ctx.guideTipMm,
          notes: addNote(state, {
            grade,
            title,
            text: `The final shot shows ${percent}% residual narrowing at the lesion.${advice}`,
            reference,
          }),
        }
      }

      case 'reset':
        return initialPractice(ctx)
    }
  }
}

/** The lowest share of the reference the lumen reaches between `fromMm` and `toMm`, and where. */
function tightestShare(lumen: Lumen, fromMm: number, toMm: number, reference: (mm: number) => number): { share: number; mm: number } {
  let worst = { share: Infinity, mm: fromMm }
  lumen.diameters.forEach((diameter, i) => {
    const mm = i * lumen.stepMm
    if (mm < fromMm - 1e-9 || mm > toMm + 1e-9) return
    const share = diameter / reference(mm)
    if (share < worst.share) worst = { share, mm }
  })
  return worst
}
