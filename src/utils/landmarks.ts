import { computeCameraBasis } from '@/utils/carm-math'
import { ANATOMY_SCALE } from '@/utils/geometry'

/**
 * Simplified spine and diaphragm, in the patient frame (anatomy units; x = patient's
 * left, y = cranial, z = anterior). They are orientation cues, not anatomy to study:
 * the spine shadow sits on the viewer's right in LAO and left in RAO, and cranial
 * angulation brings the diaphragm up into the image.
 */
// The spine runs well past the heart (y ±30) so its ends never show in the image:
// at +6/-8 its top end sat in the upper half of the spider view.
export const SPINE = { x: 0, z: -4.5, yTop: 30, yBottom: -30, width: 2.4 } as const

export interface Dome {
  side: 'right' | 'left'
  apex: readonly [number, number, number]
}

/** The right hemidiaphragm sits higher than the left. */
export const DOMES: readonly Dome[] = [
  { side: 'right', apex: [-3, -3.1, 0.5] },
  { side: 'left', apex: [3, -3.9, 0] },
]
export const DOME_SEMI_X = 3.5
export const DOME_SEMI_Z = 4.5
export const DOME_DROP = 1.5

/** Height of a dome's surface at (x, z); a paraboloid cap that drops DOME_DROP at its rim. */
function domeY(dome: Dome, x: number, z: number): number {
  const u = (x - dome.apex[0]) / DOME_SEMI_X
  const w = (z - dome.apex[2]) / DOME_SEMI_Z
  return dome.apex[1] - DOME_DROP * (u * u + w * w)
}

/** Points on a dome's cap: rings from the apex (r = 0) out to the rim (r = 1). */
function domeCapPoints(dome: Dome, rings = 8, spokes = 24): [number, number, number][] {
  const points: [number, number, number][] = []
  for (let i = 0; i <= rings; i++) {
    const r = i / rings
    const count = i === 0 ? 1 : spokes
    for (let j = 0; j < count; j++) {
      const t = (j / spokes) * Math.PI * 2
      const x = dome.apex[0] + r * DOME_SEMI_X * Math.cos(t)
      const z = dome.apex[2] + r * DOME_SEMI_Z * Math.sin(t)
      points.push([x, domeY(dome, x, z), z])
    }
  }
  return points
}

/** Screen-plane x of the spine axis and its width (same frame as the fluoro view, before zoom). */
export function projectSpine(raoLao: number, cranialCaudal: number): { x: number; width: number } {
  const { right } = computeCameraBasis(raoLao, cranialCaudal)
  // The axis is vertical, so its screen x does not depend on height (right has no y part).
  const x = (SPINE.x * right[0] + SPINE.z * right[2]) * ANATOMY_SCALE
  return { x, width: SPINE.width * ANATOMY_SCALE }
}

/**
 * Upper edge of both domes on screen, left to right: the highest projected cap point
 * in each of `samples` vertical bins (y positive is up).
 */
export function diaphragmTopEdge(raoLao: number, cranialCaudal: number, samples = 48): { x: number; y: number }[] {
  const { right, up } = computeCameraBasis(raoLao, cranialCaudal)
  const projected = DOMES.flatMap(dome => domeCapPoints(dome)).map(([x, y, z]) => ({
    x: (x * right[0] + y * right[1] + z * right[2]) * ANATOMY_SCALE,
    y: (x * up[0] + y * up[1] + z * up[2]) * ANATOMY_SCALE,
  }))
  const minX = Math.min(...projected.map(p => p.x))
  const maxX = Math.max(...projected.map(p => p.x))
  const span = maxX - minX || 1
  const bins: ({ x: number; y: number } | undefined)[] = new Array(samples).fill(undefined)
  for (const p of projected) {
    const i = Math.min(samples - 1, Math.floor(((p.x - minX) / span) * samples))
    const current = bins[i]
    if (!current || p.y > current.y) bins[i] = p
  }
  return bins.filter((p): p is { x: number; y: number } => p !== undefined).sort((a, b) => a.x - b.x)
}
