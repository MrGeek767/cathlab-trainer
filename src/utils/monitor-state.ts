import type { OpaqueRange } from './contrast'

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
