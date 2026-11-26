import type { Device } from '@/data/devices'
import { diameterAt } from './compliance'
import type { Rail } from './rail'

/** What the monitor draws for the practice: the wire, the device in hand and a placed stent. */
export interface DeviceScene {
  rail: Rail
  guideTipMm: number
  wireTipMm: number
  inHand: Device | null
  /** The device's distal end, in rail mm. */
  tipMm: number
  /** Pressure while inflating, else null. */
  atm: number | null
  stent: { startRailMm: number; endRailMm: number; diameterMm: number } | null
}

/** Rail positions of the two radiopaque markers: the ends of the working length. */
export function markerPositions(inHand: Device, tipMm: number): [number, number] {
  return [tipMm - inHand.lengthMm, tipMm]
}

/** The balloon's drawn diameter: nothing until it opens, then what the chart gives. */
export function balloonDiameterShown(inHand: Device, atm: number | null): number {
  return atm === null ? 0 : diameterAt(inHand, atm)
}

/**
 * A balloon's outline along its length (0..1 of `lengthMm`): rising smoothly over
 * `shoulderMm` at each end to full size in the middle.
 */
export function shoulderProfile(lengthMm: number, shoulderMm: number): (t: number) => number {
  const s = Math.min(shoulderMm / lengthMm, 0.5)
  const smooth = (x: number) => x * x * (3 - 2 * x)
  return t => {
    const fromEnd = Math.min(t, 1 - t)
    return fromEnd >= s ? 1 : smooth(Math.max(fromEnd, 0) / s)
  }
}
