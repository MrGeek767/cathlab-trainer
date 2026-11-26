import type { ArterySegment } from '@/types/anatomy'

/** The practice lesion (design §6): a focal stenosis in a segment, measured from its start. */
export interface PracticeLesion {
  segmentId: string
  startMm: number
  lengthMm: number
  /** Diameter stenosis at its tightest, 0..1. */
  stenosis: number
}

export const PRACTICE_LESION: PracticeLesion = { segmentId: 'prox-lad', startMm: 8, lengthMm: 12, stenosis: 0.75 }

/** Lumen samples are this far apart along the segment. */
export const LUMEN_STEP_MM = 0.5

/** The contrast column's diameter along a segment: sample i is i × stepMm from its start. */
export interface Lumen {
  stepMm: number
  diameters: number[]
}

/** The healthy diameter at `mm`: tapering from the segment's start diameter to its end diameter. */
export function referenceAt(segment: ArterySegment, segmentLengthMm: number, mm: number): number {
  const t = Math.min(Math.max(mm / segmentLengthMm, 0), 1)
  return 2 * (segment.startRadius + (segment.endRadius - segment.startRadius) * t)
}

/** The reference with the lesion's narrowing: a smooth dip, tightest at its centre. */
export function initialLumen(segment: ArterySegment, segmentLengthMm: number, lesion: PracticeLesion): Lumen {
  const count = Math.round(segmentLengthMm / LUMEN_STEP_MM) + 1
  const diameters = Array.from({ length: count }, (_, i) => {
    const mm = i * LUMEN_STEP_MM
    const inside = (mm - lesion.startMm) / lesion.lengthMm
    const dip = inside > 0 && inside < 1 ? 0.5 * (1 - Math.cos(2 * Math.PI * inside)) : 0
    return referenceAt(segment, segmentLengthMm, mm) * (1 - lesion.stenosis * dip)
  })
  return { stepMm: LUMEN_STEP_MM, diameters }
}

/** The lumen diameter at `mm`, read between samples and clamped past the ends. */
export function lumenAt(lumen: Lumen, mm: number): number {
  const last = lumen.diameters.length - 1
  const x = Math.min(Math.max(mm / lumen.stepMm, 0), last)
  const i = Math.min(Math.floor(x), Math.max(last - 1, 0))
  const a = lumen.diameters[i] ?? 0
  const b = lumen.diameters[i + 1] ?? a
  return a + (b - a) * (x - i)
}

/** The tightest sample between `fromMm` and `toMm`. */
export function narrowest(lumen: Lumen, fromMm: number, toMm: number): { mm: number; diameterMm: number } {
  let best = { mm: fromMm, diameterMm: Infinity }
  lumen.diameters.forEach((diameterMm, i) => {
    const mm = i * lumen.stepMm
    if (mm >= fromMm - 1e-9 && mm <= toMm + 1e-9 && diameterMm < best.diameterMm) best = { mm, diameterMm }
  })
  return best
}
