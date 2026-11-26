import type { ArterySegment } from '@/types/anatomy'
import type { Device } from '@/data/devices'
import { diameterAt } from './compliance'
import { narrowest, referenceAt, type Lumen, type PracticeLesion } from './lesion'

/**
 * How the lesion responds to each inflation (design §7.4). Illustrative values, for the
 * reviewers to set: a balloon alone lets the vessel recoil; a stent holds it open but
 * under-expands against the lesion, less so after predilation and at higher pressure;
 * a non-compliant post-dilation balloon brings the stent almost to its own size.
 */
export const RESPONSE = {
  /** The lesion keeps this share of a balloon's diameter after deflation. */
  recoil: 0.75,
  /** Stent expansion in the lesion at nominal and at RBP, after predilation. */
  stentPrepared: [0.9, 0.95],
  /** The same without predilation. */
  stentDirect: [0.85, 0.9],
  /** A balloon inside the stent brings it to this share of the balloon's diameter. */
  postDilation: 0.97,
  /** Wider than the reference by more than this at an edge risks dissection. */
  edgeRatio: 1.1,
  /** A stented lumen narrower than this share of the reference is under-expanded. */
  residualBelow: 0.9,
  /** Healthy vessel a stent should cover beyond each end of the lesion. */
  landingMm: 2,
  /** A balloon covering this share of the lesion has prepared it. */
  preparedCover: 0.75,
} as const

/** A stretch of the segment, in mm from its start. */
export interface Span {
  startMm: number
  endMm: number
}

export interface PlacedStent extends Span {
  nominalDiameterMm: number
  /** It left part (or all) of the lesion and its landing zones uncovered. */
  missedLesion?: boolean
}

export type Finding =
  /** The device was inflated beside the lesion and covered none of it. */
  | { kind: 'missed-lesion'; by: 'balloon' | 'stent' }
  /** A post-dilation balloon inflated outside the stent it was meant to expand. */
  | { kind: 'missed-stent' }
  | { kind: 'geographic-miss'; uncoveredMm: number }
  | { kind: 'edge-dissection-risk'; atMm: number; ratio: number }
  | { kind: 'residual-stenosis'; percentOfReference: number }
  | { kind: 'partial-cover'; coveredFraction: number }

export interface Vessel {
  lumen: Lumen
  stent: PlacedStent | null
  predilated: boolean
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(Math.max(t, 0), 1)
const within = (mm: number, span: Span) => mm >= span.startMm - 1e-9 && mm <= span.endMm + 1e-9
const overlap = (a: Span, b: Span) => Math.max(0, Math.min(a.endMm, b.endMm) - Math.max(a.startMm, b.startMm))

/** Apply one inflation of `device` over `span` at `atm`, returning the new vessel and what it found. */
export function applyInflation(
  vessel: Vessel,
  device: Device,
  span: Span,
  atm: number,
  segment: ArterySegment,
  segmentLengthMm: number,
  lesion: PracticeLesion,
): { vessel: Vessel; findings: Finding[] } {
  const open = diameterAt(device, atm)
  if (open === 0) return { vessel, findings: [] }

  const lesionSpan: Span = { startMm: lesion.startMm, endMm: lesion.startMm + lesion.lengthMm }
  const reference = (mm: number) => referenceAt(segment, segmentLengthMm, mm)
  const findings: Finding[] = []
  const diameters = [...vessel.lumen.diameters]
  const isStent = device.category === 'stent'
  const stentBefore = vessel.stent

  // How far the stent expands against the lesion, by pressure and preparation.
  const [atNominal, atRbp] = vessel.predilated ? RESPONSE.stentPrepared : RESPONSE.stentDirect
  const expansion = lerp(atNominal, atRbp, (atm - device.chart.nominalAtm) / (device.chart.rbpAtm - device.chart.nominalAtm))

  diameters.forEach((old, i) => {
    const mm = i * vessel.lumen.stepMm
    if (!within(mm, span)) return
    const inLesion = within(mm, lesionSpan)
    if (isStent) {
      diameters[i] = Math.max(old, inLesion ? expansion * open : open)
    } else if (stentBefore && within(mm, stentBefore)) {
      diameters[i] = Math.max(old, RESPONSE.postDilation * open)
    } else if (inLesion) {
      diameters[i] = Math.max(old, RESPONSE.recoil * open)
    }
  })

  let predilated = vessel.predilated
  let stent = stentBefore
  if (isStent) {
    const shortfall = Math.max(
      span.startMm - (lesionSpan.startMm - RESPONSE.landingMm),
      lesionSpan.endMm + RESPONSE.landingMm - span.endMm,
    )
    // A stent on healthy vessel missed the lesion outright; one short of a landing zone is a geographic miss.
    if (overlap(span, lesionSpan) <= 1e-9) findings.push({ kind: 'missed-lesion', by: 'stent' })
    else if (shortfall > 1e-9) findings.push({ kind: 'geographic-miss', uncoveredMm: shortfall })
    stent = { startMm: span.startMm, endMm: span.endMm, nominalDiameterMm: device.diameterMm, missedLesion: shortfall > 1e-9 }
  } else if (!stentBefore) {
    const coveredFraction = overlap(span, lesionSpan) / lesion.lengthMm
    if (coveredFraction >= RESPONSE.preparedCover) predilated = true
    if (coveredFraction <= 1e-9) findings.push({ kind: 'missed-lesion', by: 'balloon' })
    else if (coveredFraction < 1 - 1e-9) findings.push({ kind: 'partial-cover', coveredFraction })
  } else if (overlap(span, stentBefore) <= 1e-9) {
    findings.push({ kind: 'missed-stent' })
  }

  // Edges: a stent at both ends; a balloon where it reaches beyond any stent.
  for (const end of [span.startMm, span.endMm]) {
    if (!isStent && stentBefore && within(end, stentBefore)) continue
    const ratio = open / reference(end)
    if (ratio > RESPONSE.edgeRatio) findings.push({ kind: 'edge-dissection-risk', atMm: end, ratio })
  }

  const lumen: Lumen = { stepMm: vessel.lumen.stepMm, diameters }
  if (stent && (isStent || stentBefore)) {
    const tightest = narrowest(lumen, stent.startMm, stent.endMm)
    const share = tightest.diameterMm / reference(tightest.mm)
    if (share < RESPONSE.residualBelow) findings.push({ kind: 'residual-stenosis', percentOfReference: share * 100 })
  }

  return { vessel: { lumen, stent, predilated }, findings }
}
