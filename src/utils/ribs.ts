/**
 * Simplified ribs for the fluoro view, in the patient frame (anatomy units of 18 mm;
 * x = patient's left, y = cranial, z = anterior). Each rib leaves the spine at the
 * back, sweeps out around an elliptical chest wall and falls toward its front end,
 * where the bony rib gives way to cartilage (which does not show on X-ray).
 */
export const THORAX = { halfWidth: 7.8, halfDepth: 5.5, centreZ: -0.3 } as const

/** Height of each rib where it leaves the spine, top to bottom (about 27 mm apart). */
export const RIB_LEVELS = [7, 5.5, 4, 2.5, 1, -0.5, -2, -3.5, -5] as const

/** How far a rib falls from the spine to its front end (about 36–50 mm, more for lower ribs). */
export const RIB_DROP = 2.0
const RIB_DROP_PER_LEVEL = 0.09

/** Rib thickness as drawn. */
export const RIB_RADIUS_MM = 4.5

const ANGLE_START = 0.2 // beside the spine
const ANGLE_END = 2.15 // the front end of the bony rib; cartilage beyond it does not show

export function ribPoints(side: 'left' | 'right', spineY: number, samples = 24): [number, number, number][] {
  const sign = side === 'left' ? 1 : -1
  const points: [number, number, number][] = []
  for (let k = 0; k <= samples; k++) {
    const t = k / samples
    const angle = ANGLE_START + (ANGLE_END - ANGLE_START) * t
    points.push([
      sign * THORAX.halfWidth * Math.sin(angle),
      // Falls from the spine onward, steepest near the back as posterior ribs do.
      spineY - (RIB_DROP + RIB_DROP_PER_LEVEL * Math.max(0, 7 - spineY)) * Math.pow(t, 0.8),
      THORAX.centreZ - THORAX.halfDepth * Math.cos(angle),
    ])
  }
  return points
}
