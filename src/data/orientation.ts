import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'

/**
 * iiviewer's coronary model stands too upright, so standard views show the
 * wrong shapes (for example an "L"-like RCA in LAO instead of the textbook "C").
 * This rotation puts the whole model (tree and heart mesh) into its usual chest
 * position: tipped 40° forward about the patient's left-right axis, then turned
 * 25° to the left about the vertical axis. The long axis (base to apex) then
 * points about 50° left of anterior and 28° below horizontal, close to the
 * textbook ~45° left / ~30° down. Chosen so that every textbook view rule in
 * orientation.test.ts holds with margin.
 */
export const HEART_TIP_FORWARD_DEG = -40
export const HEART_TURN_LEFT_DEG = 25

const DEG = Math.PI / 180

/** Rotation from iiviewer's model frame into the patient frame: Ry(turn) · Rx(tip). */
export const MODEL_TO_PATIENT = new THREE.Matrix4()
  .makeRotationY(HEART_TURN_LEFT_DEG * DEG)
  .multiply(new THREE.Matrix4().makeRotationX(HEART_TIP_FORWARD_DEG * DEG))

/** The same rotation as a quaternion, for rotating meshes (the 3D heart). */
export const MODEL_TO_PATIENT_QUATERNION = new THREE.Quaternion().setFromRotationMatrix(MODEL_TO_PATIENT)

/** Return copies of the segments with control points in the patient frame. */
export function orientAnatomy(segments: ArterySegment[]): ArterySegment[] {
  const v = new THREE.Vector3()
  return segments.map(segment => ({
    ...segment,
    controlPoints: segment.controlPoints.map(([x, y, z]) => {
      v.set(x, y, z).applyMatrix4(MODEL_TO_PATIENT)
      return [v.x, v.y, v.z] as [number, number, number]
    }),
  }))
}
