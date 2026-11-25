import { useMemo } from 'react'
import type { DominanceType } from '@/types/angles'
import type { ArterySegment } from '@/types/anatomy'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { LEFT_DOMINANT_SEGMENTS } from '@/data/arteries-left-dominant'
import { CODOMINANT_SEGMENTS } from '@/data/arteries-codominant'
import { applyAnatomy } from '@/data/segment-sizes'

export function useArteryData(dominance: DominanceType): ArterySegment[] {
  return useMemo(() => {
    switch (dominance) {
      case 'right': return applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')
      case 'left': return applyAnatomy(LEFT_DOMINANT_SEGMENTS, 'left')
      case 'codominant': return applyAnatomy(CODOMINANT_SEGMENTS, 'codominant')
    }
  }, [dominance])
}
