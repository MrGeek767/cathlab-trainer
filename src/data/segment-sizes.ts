import type { ArterySegment } from '@/types/anatomy'
import type { DominanceType } from '@/types/angles'
import { buildArterySpline, ANATOMY_SCALE, ANATOMY_UNIT_MM } from '@/utils/geometry'

/**
 * Real-world vessel sizes, scale and SYNTAX numbers for the coronary model.
 *
 * Sources and reasoning (reviewers to confirm):
 * - Proximal diameters: QCA in 933 normal angiograms, Indian Heart J 2021
 *   (doi:10.1016/j.ihj.2021.04.001): LM 4.16, prox LAD 3.22, D1 1.76, prox LCx 3.02,
 *   OM 2.10, prox RCA 3.05 mm (means).
 * - Branch splits: Finet's law, proximal = 0.678 × (distal main + side branch).
 * - Dominance: smaller RCA and larger LCx in left dominance (Dodge et al.,
 *   Circulation 1992).
 * - D2, OM2, AM, the first septal and the distal end sizes are assumptions.
 * - SYNTAX numbers: syntaxscore.org, Appendix I (segment definitions).
 *
 * iiviewer's anatomy is about half real size, so one anatomy unit is 18 mm.
 * With it, the LAD is about 107 mm, the RCA to the crux about 140 mm and the
 * LM about 17 mm, all within typical adult ranges.
 */
export { ANATOMY_UNIT_MM } from '@/utils/geometry'

type Diameters = readonly [start: number, end: number]

const RIGHT: Record<string, Diameters> = {
  lm: [4.2, 4.2],
  'prox-lad': [3.2, 3.1],
  'mid-lad': [2.8, 2.2],
  'dist-lad': [2.2, 1.2],
  d1: [1.8, 1.2],
  d2: [1.5, 1.0],
  sep1: [1.0, 0.6],
  'prox-lcx': [3.0, 2.9],
  om1: [2.1, 1.4],
  om2: [1.8, 1.2],
  'dist-lcx': [2.2, 1.4],
  'prox-rca': [3.2, 3.1],
  'mid-rca': [3.1, 2.9],
  'dist-rca': [2.9, 2.6],
  am: [1.4, 1.0],
  pda: [2.0, 1.2],
  plv: [1.8, 1.0],
}

export const SEGMENT_DIAMETERS_MM: Record<DominanceType, Record<string, Diameters>> = {
  right: RIGHT,
  left: {
    ...RIGHT,
    lm: [4.4, 4.4],
    'prox-rca': [2.3, 2.2],
    'mid-rca': [2.2, 2.0],
    'dist-rca': [2.0, 1.4],
    'prox-lcx': [3.4, 3.3],
    'dist-lcx': [3.0, 2.6],
    pda: [2.0, 1.2],
    plv: [1.8, 1.0],
  },
  codominant: {
    ...RIGHT,
    lm: [4.3, 4.3],
    'prox-lcx': [3.2, 3.1],
    'dist-lcx': [2.6, 2.0],
    'prox-rca': [3.0, 2.9],
    'mid-rca': [2.9, 2.7],
    'dist-rca': [2.7, 2.2],
    pda: [2.0, 1.2],
    plv: [1.8, 1.0],
  },
}

const SYNTAX_RIGHT: Record<string, string | null> = {
  'prox-rca': '1',
  'mid-rca': '2',
  'dist-rca': '3',
  pda: '4',
  lm: '5',
  'prox-lad': '6',
  'mid-lad': '7',
  'dist-lad': '8',
  d1: '9',
  d2: '10',
  'prox-lcx': '11',
  om1: '12a',
  om2: '12b',
  'dist-lcx': '13',
  plv: '16',
  sep1: null,
  am: null,
}

export const SYNTAX_SEGMENT: Record<DominanceType, Record<string, string | null>> = {
  right: SYNTAX_RIGHT,
  // Left dominance: the PDA (15) and posterolateral (14) come from the LCx.
  left: { ...SYNTAX_RIGHT, pda: '15', plv: '14' },
  // Codominance (classical scheme used in this app): PDA from the RCA, PLV from the LCx.
  codominant: { ...SYNTAX_RIGHT, pda: '4', plv: '14' },
}

/** Return copies of the segments with real-world radii (mm) and SYNTAX numbers. */
export function applyAnatomy(segments: ArterySegment[], dominance: DominanceType): ArterySegment[] {
  return segments.map(segment => {
    const size = SEGMENT_DIAMETERS_MM[dominance][segment.id]
    if (!size) throw new Error(`No size for segment ${segment.id} (${dominance})`)
    return {
      ...segment,
      startRadius: size[0] / 2,
      endRadius: size[1] / 2,
      syntaxSegment: SYNTAX_SEGMENT[dominance][segment.id] ?? null,
    }
  })
}

/** Centreline length of a segment in millimetres. */
export function segmentLengthMm(segment: ArterySegment): number {
  return (buildArterySpline(segment.controlPoints).getLength() / ANATOMY_SCALE) * ANATOMY_UNIT_MM
}
