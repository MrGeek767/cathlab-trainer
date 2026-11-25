import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import { ANATOMY_SCALE, buildArterySpline } from './geometry'
import { fitEllipsoid, type Ellipsoid } from './ellipsoid'

/**
 * How the heart moves at end-systole, as fractions of each distance from the pivot:
 * the base descends toward the apex along the long axis, the walls come in toward the
 * axis, and the ventricle twists a few degrees. Coronary arteries ride on the surface,
 * so on a cine they swing with every beat; the right coronary in the AV groove most.
 */
export const HEART_MOTION = { longitudinal: 0.12, radial: 0.08, twistDeg: 5 } as const

/** How far from the centre toward the apex the heart pivots (apex moves least). */
const PIVOT_TOWARD_APEX = 0.6

export interface HeartFrame {
  /** The point that stays still. */
  pivot: THREE.Vector3
  /** Unit long axis, pointing toward the apex. */
  apex: THREE.Vector3
  /** Unit axes across the heart, completing a right-handed set with `apex`. */
  across: [THREE.Vector3, THREE.Vector3]
}

export interface Heart {
  /** The cardiac silhouette: an ellipsoid fitted to the coronary tree. */
  ellipsoid: Ellipsoid
  frame: HeartFrame
}

/** Fit the heart to the coronary tree, which lies on its surface. */
export function heartFromAnatomy(segments: ArterySegment[]): Heart {
  const points = segments.flatMap(segment =>
    buildArterySpline(segment.controlPoints)
      .getSpacedPoints(12)
      .map(p => [p.x, p.y, p.z] as [number, number, number]),
  )
  const ellipsoid = fitEllipsoid(points)
  const centre = new THREE.Vector3(...ellipsoid.center)
  const apex = new THREE.Vector3(...ellipsoid.axes[0])
  let second = new THREE.Vector3(...ellipsoid.axes[1])
  // The LAD runs down to the apex, so its end tells which way the long axis points.
  const lad = segments.find(s => s.id === 'dist-lad')
  const ladEnd = lad?.controlPoints[lad.controlPoints.length - 1]
  if (ladEnd && apex.dot(new THREE.Vector3(...ladEnd).multiplyScalar(ANATOMY_SCALE).sub(centre)) < 0) {
    apex.negate()
    second = second.negate()
  }
  const third = new THREE.Vector3().crossVectors(apex, second)
  const pivot = centre.clone().addScaledVector(apex, ellipsoid.radii[0] * PIVOT_TOWARD_APEX)
  return { ellipsoid, frame: { pivot, apex, across: [second, third] } }
}

const basis = new THREE.Matrix4()
const scaling = new THREE.Matrix4()
const twist = new THREE.Matrix4()
const shift = new THREE.Matrix4()

/** The transform that moves the relaxed heart to `contraction` (0 relaxed, 1 end-systole). */
export function heartMotionMatrix(frame: HeartFrame, contraction: number, target = new THREE.Matrix4()): THREE.Matrix4 {
  target.identity()
  if (contraction <= 0) return target
  const longitudinal = 1 - HEART_MOTION.longitudinal * contraction
  const radial = 1 - HEART_MOTION.radial * contraction
  basis.makeBasis(frame.apex, frame.across[0], frame.across[1])
  scaling.makeScale(longitudinal, radial, radial)
  twist.makeRotationAxis(frame.apex, THREE.MathUtils.degToRad(HEART_MOTION.twistDeg * contraction))
  // pivot · twist · (basis · scale · basisᵀ) · -pivot
  target.makeTranslation(frame.pivot)
  target.multiply(twist)
  target.multiply(basis)
  target.multiply(scaling)
  target.multiply(basis.transpose())
  target.multiply(shift.makeTranslation(-frame.pivot.x, -frame.pivot.y, -frame.pivot.z))
  return target
}
