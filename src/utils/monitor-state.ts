import type { InjectionSide, OpaqueRange } from './contrast'
import type { CoronarySystem } from '@/types/angles'

const NO_CONTRAST: Map<string, OpaqueRange> = new Map()

/**
 * Which arteries the monitor shows. A contrast run shows what holds contrast. Between
 * runs the road map keeps every artery in view (`null`), while real fluoro shows none,
 * as on a real screen: without contrast the arteries are invisible.
 */
export function vesselOpacity(
  realFluoro: boolean,
  run: Map<string, OpaqueRange> | null,
): Map<string, OpaqueRange> | null {
  return run ?? (realFluoro ? NO_CONTRAST : null)
}

/**
 * The coronary a run injects: the question's own side while a real-fluoro question keeps
 * injecting (its target can only be seen there), otherwise the learner's pick. The pick
 * itself is never overwritten, so it is back in force once the question ends.
 */
export function injectionSideFor(loopSide: InjectionSide | null, chosen: InjectionSide): InjectionSide {
  return loopSide ?? chosen
}

/**
 * Which coronary the monitor draws. Explore's arteries filter applies between runs; during
 * a run it steps aside, because contrast decides what shows: injecting the right coronary
 * with the filter on the left still shows the right coronary. Other tabs show both.
 */
export function systemShown(explore: boolean, filter: CoronarySystem, running: boolean): CoronarySystem {
  return explore && !running ? filter : 'both'
}

export interface LabelsState {
  /** Segment names on the monitor. */
  on: boolean
  /** Why the Labels switch can't be changed now; null when it can. */
  lock: string | null
}

/**
 * Whether the monitor names the segments, and what the Labels switch shows: it always
 * shows what the monitor is doing. Exams and on-screen questions hide every name (hover
 * included), so the answer cannot leak; Learn always names them; otherwise the learner
 * decides.
 */
export function labelsState(state: { learn: boolean; question: boolean; exam: boolean; chosen: boolean }): LabelsState {
  if (state.exam) return { on: false, lock: 'Exams hide the segment names' }
  if (state.question) return { on: false, lock: 'Names are hidden while a question is on screen' }
  if (state.learn) return { on: true, lock: 'Learn always names the segments' }
  return { on: state.chosen, lock: null }
}
