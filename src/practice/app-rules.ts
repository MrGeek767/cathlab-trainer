import type { AppMode, DominanceType } from '@/types/angles'

/** The anatomy the monitor shows: the practice patient is always right dominant (plan Task 10). */
export function effectiveDominance(mode: AppMode, chosen: DominanceType): DominanceType {
  return mode === 'cathlab' ? 'right' : chosen
}

/**
 * The operator's working view for the proximal LAD lesion. In this anatomy it lays the
 * segment out at under 20% foreshortening, where the default AP view hides most of it.
 */
export const PRACTICE_WORKING_VIEW = { raoLao: -45, cranialCaudal: 30 } as const
