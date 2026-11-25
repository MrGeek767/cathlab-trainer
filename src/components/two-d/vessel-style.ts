import * as THREE from 'three'
import type { ViewMode } from '@/types/angles'

/**
 * How a vessel is drawn. `target` and `dim` only occur during a challenge question,
 * and are neutral grey so a colour never names the highlighted vessel.
 */
export type VesselTone = 'normal' | 'hover' | 'target' | 'dim'

export interface VesselStyle {
  color: string
  opacity: number
  transparent: boolean
}

export function vesselStyle(viewMode: ViewMode, tone: VesselTone, segmentColor: string): VesselStyle {
  if (viewMode === 'fluoroscopy') {
    // The raw scene is light-on-black and inverted for display: lighter means denser.
    if (tone === 'hover' || tone === 'target') return { color: '#ffffff', opacity: 0.95, transparent: true }
    return { color: '#cccccc', opacity: tone === 'dim' ? 0.45 : 0.7, transparent: true }
  }
  switch (tone) {
    case 'hover':
      return { color: segmentColor, opacity: 1, transparent: false }
    case 'normal':
      return { color: `#${new THREE.Color(segmentColor).multiplyScalar(0.9).getHexString()}`, opacity: 1, transparent: false }
    case 'target':
      return { color: '#111827', opacity: 1, transparent: false }
    case 'dim':
      return { color: '#9ca3af', opacity: 0.35, transparent: true }
  }
}
