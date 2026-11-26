import * as THREE from 'three'
import { MM_TO_SCENE } from '@/utils/geometry'

/** The left main and the whole LAD: where the practice wire runs. */
export const LAD_RAIL = ['lm', 'prox-lad', 'mid-lad', 'dist-lad'] as const

/**
 * A course through consecutive vessel segments, measured in mm from its start. The wire,
 * balloons and stents sit at positions along it (design §7.3, the rail model).
 */
export interface Rail {
  lengthMm: number
  pointAt(mm: number): THREE.Vector3
  tangentAt(mm: number): THREE.Vector3
  /** Where a segment starts on the rail, in mm. */
  startOf(segmentId: string): number
}

/** Join the drawn centre lines of `ids`, in order, into one rail. */
export function buildRail(ids: readonly string[], paths: Map<string, THREE.Curve<THREE.Vector3>>): Rail {
  const parts = ids.map(id => {
    const curve = paths.get(id)
    if (!curve) throw new Error(`No drawn path for segment ${id}`)
    return { id, curve, lengthMm: curve.getLength() / MM_TO_SCENE, startMm: 0 }
  })
  let total = 0
  for (const part of parts) {
    part.startMm = total
    total += part.lengthMm
  }
  const locate = (mm: number) => {
    const at = Math.min(Math.max(mm, 0), total)
    const part = parts.find(p => at <= p.startMm + p.lengthMm + 1e-9) ?? parts[parts.length - 1]!
    return { part, t: part.lengthMm > 0 ? Math.min(Math.max((at - part.startMm) / part.lengthMm, 0), 1) : 0 }
  }
  return {
    lengthMm: total,
    pointAt: mm => {
      const { part, t } = locate(mm)
      return part.curve.getPointAt(t)
    },
    tangentAt: mm => {
      const { part, t } = locate(mm)
      return part.curve.getTangentAt(t).normalize()
    },
    startOf: segmentId => {
      const part = parts.find(p => p.id === segmentId)
      if (!part) throw new Error(`Segment ${segmentId} is not on this rail`)
      return part.startMm
    },
  }
}
