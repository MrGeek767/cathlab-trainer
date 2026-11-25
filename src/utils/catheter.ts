import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import type { InjectionSide } from './contrast'
import { ANATOMY_SCALE, MM_TO_SCENE, buildArterySpline } from './geometry'

/** The ascending aorta runs up from the root, a little to the patient's right and forward. */
export const AORTA_DIRECTION = new THREE.Vector3(-0.22, 1, 0.12).normalize()

/** The aortic root: between the left main and right coronary ostia. */
export function aorticRootCentre(segments: ArterySegment[]): THREE.Vector3 | null {
  const lm = segments.find(s => s.id === 'lm')?.controlPoints[0]
  const rca = segments.find(s => s.id === 'prox-rca')?.controlPoints[0]
  if (!lm || !rca) return null
  return new THREE.Vector3(...lm).add(new THREE.Vector3(...rca)).multiplyScalar(ANATOMY_SCALE / 2)
}

/** How deep the catheter tip sits in the ostium. */
const ENGAGED_MM = 2

/**
 * The guide catheter's course for an injection: its tip seated just inside the left
 * main or right coronary ostium, curving back into the aortic root and up the
 * ascending aorta, out of the top of the field. Contrast enters from its tip.
 */
export function catheterPath(segments: ArterySegment[], side: InjectionSide): THREE.Curve<THREE.Vector3> | null {
  const vessel = segments.find(s => s.id === (side === 'left' ? 'lm' : 'prox-rca'))
  const root = aorticRootCentre(segments)
  if (!vessel || !root) return null
  const spline = buildArterySpline(vessel.controlPoints)
  const ostium = spline.getPointAt(0)
  const into = spline.getTangentAt(0)
  const up = (mm: number) => root.clone().addScaledVector(AORTA_DIRECTION, mm * MM_TO_SCENE)
  return new THREE.CatmullRomCurve3(
    [
      ostium.clone().addScaledVector(into, ENGAGED_MM * MM_TO_SCENE),
      ostium.clone().addScaledVector(into, -6 * MM_TO_SCENE),
      up(14),
      up(45),
      up(80),
      up(125),
    ],
    false,
    'centripetal',
  )
}
