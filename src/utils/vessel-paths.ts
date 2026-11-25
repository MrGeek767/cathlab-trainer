import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import { ANATOMY_SCALE, buildArterySpline } from './geometry'

/**
 * Centre lines for drawing the arteries.
 *
 * Each segment has its own spline, so where one segment of an artery runs into the next
 * (proximal into mid LAD, say) the course can kink by up to ~35°. A real vessel bends
 * smoothly there, and the kink also shows as a sudden change in density on the
 * angiogram. So the segments of one artery are drawn along a single spline through all
 * of their points, each segment taking its own stretch of it. Branches and the left
 * main's bifurcation keep their own splines. Measurements (view quality, lengths) still
 * use each segment's own spline; the two differ by a millimetre or so near a joint.
 */
export function buildVesselPaths(segments: ArterySegment[]): Map<string, THREE.Curve<THREE.Vector3>> {
  const paths = new Map<string, THREE.Curve<THREE.Vector3>>()
  for (const chain of arteryChains(segments)) {
    if (chain.length === 1) {
      paths.set(chain[0]!.id, buildArterySpline(chain[0]!.controlPoints))
      continue
    }
    // One spline through every point of the artery; neighbouring segments share their joint point.
    const points: [number, number, number][] = []
    const ranges: [number, number][] = []
    for (const segment of chain) {
      const from = points.length === 0 ? 0 : points.length - 1
      points.push(...(points.length === 0 ? segment.controlPoints : segment.controlPoints.slice(1)))
      ranges.push([from, points.length - 1])
    }
    const whole = buildArterySpline(points)
    const last = points.length - 1
    chain.forEach((segment, i) => {
      const [from, to] = ranges[i]!
      paths.set(segment.id, new SubCurve(whole, from / last, to / last))
    })
  }
  return paths
}

/** The stretch of `base` between curve parameters t0 and t1. */
class SubCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly base: THREE.Curve<THREE.Vector3>,
    private readonly t0: number,
    private readonly t1: number,
  ) {
    super()
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return this.base.getPoint(this.t0 + (this.t1 - this.t0) * t, target)
  }
}

const PART = /^(prox|mid|dist)-(.+)$/

/**
 * Segments grouped into arteries: a segment joins its parent's group when it is the next
 * part of the same artery (prox-lad → mid-lad → dist-lad) and starts where the parent ends.
 */
function arteryChains(segments: ArterySegment[]): ArterySegment[][] {
  const byId = new Map(segments.map(s => [s.id, s]))
  const continues = (segment: ArterySegment): ArterySegment | null => {
    const parent = segment.parentId ? byId.get(segment.parentId) : undefined
    const mine = PART.exec(segment.id)
    const theirs = parent ? PART.exec(parent.id) : null
    if (!parent || !mine || !theirs || mine[2] !== theirs[2]) return null
    const start = new THREE.Vector3(...segment.controlPoints[0]!).multiplyScalar(ANATOMY_SCALE)
    const end = new THREE.Vector3(...parent.controlPoints[parent.controlPoints.length - 1]!).multiplyScalar(ANATOMY_SCALE)
    return start.distanceTo(end) < 1e-6 ? parent : null
  }
  const next = new Map<string, ArterySegment>()
  for (const segment of segments) {
    const parent = continues(segment)
    if (parent) next.set(parent.id, segment)
  }
  const chains: ArterySegment[][] = []
  for (const segment of segments) {
    if (continues(segment)) continue // part of a chain that starts further up
    const chain = [segment]
    for (let s = next.get(segment.id); s; s = next.get(s.id)) chain.push(s)
    chains.push(chain)
  }
  return chains
}
