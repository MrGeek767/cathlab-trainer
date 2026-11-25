import * as THREE from 'three'
import type { ViewMode } from '@/types/angles'

/**
 * How a vessel is drawn. `target` and `dim` only occur during a challenge question,
 * and are neutral so a colour never names the highlighted vessel.
 */
export type VesselTone = 'normal' | 'hover' | 'target' | 'dim'

export interface VesselStyle {
  /** Diagram view. */
  color: string
  opacity: number
  transparent: boolean
  /** Fluoro view: multiplies the vessel's contrast density, so higher reads darker. */
  density: number
}

const FLUORO_DENSITY: Record<VesselTone, number> = { normal: 1, hover: 1.8, target: 2, dim: 0.3 }

export function vesselStyle(viewMode: ViewMode, tone: VesselTone, segmentColor: string): VesselStyle {
  if (viewMode === 'fluoroscopy') {
    return { color: '#ffffff', opacity: 1, transparent: false, density: FLUORO_DENSITY[tone] }
  }
  switch (tone) {
    case 'hover':
      return { color: segmentColor, opacity: 1, transparent: false, density: 1 }
    case 'normal':
      return {
        color: `#${new THREE.Color(segmentColor).multiplyScalar(0.9).getHexString()}`,
        opacity: 1,
        transparent: false,
        density: 1,
      }
    case 'target':
      // The diagram has a dark background, so the target is drawn near white.
      return { color: '#F4F7FA', opacity: 1, transparent: false, density: 1 }
    case 'dim':
      return { color: '#6F89A3', opacity: 0.4, transparent: true, density: 1 }
  }
}
