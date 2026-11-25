import { useEffect, useMemo } from 'react'
import type { ArterySegment } from '@/types/anatomy'
import type { InjectionSide } from '@/utils/contrast'
import { catheterPath } from '@/utils/catheter'
import { addAxisAttribute, addRadiusAttribute, buildTaperedTubeGeometry } from '@/utils/geometry'
import { CONTRAST_ATTENUATION_PER_MM, VESSEL_BEHIND_LAYER, VESSEL_LAYER, lumenMaterial } from './density'

/** A 6 French guide catheter: 2 mm across. */
const CATHETER_RADIUS_MM = 1
/** Braided wall and a contrast-filled lumen: a little denser than a vessel its size. */
const CATHETER_DENSITY = 1.3
const RINGS = 48
const SIDES = 8

/**
 * The guide catheter seated in the coronary being injected, drawn like a vessel so it
 * shows in real fluoro between runs (where to look) and contrast leaves its tip.
 * Never picked: it lives only on the vessel render layers, not layer 0.
 */
export function GuideCatheter({ segments, side }: { segments: ArterySegment[]; side: InjectionSide }) {
  const geometry = useMemo(() => {
    const path = catheterPath(segments, side)
    if (!path) return null
    const tube = buildTaperedTubeGeometry(path, CATHETER_RADIUS_MM, CATHETER_RADIUS_MM, RINGS, SIDES)
    addRadiusAttribute(tube, CATHETER_RADIUS_MM, CATHETER_RADIUS_MM, RINGS, SIDES)
    addAxisAttribute(tube, RINGS, SIDES)
    return tube
  }, [segments, side])
  const materials = useMemo(() => {
    const front = lumenMaterial('front')
    const behind = lumenMaterial('behind')
    front.uniforms.uDensity!.value = CONTRAST_ATTENUATION_PER_MM * CATHETER_DENSITY
    behind.uniforms.uDensity!.value = CONTRAST_ATTENUATION_PER_MM * CATHETER_DENSITY
    return { front, behind }
  }, [])
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(
    () => () => {
      materials.front.dispose()
      materials.behind.dispose()
    },
    [materials],
  )
  if (!geometry) return null
  return (
    <>
      <mesh geometry={geometry} material={materials.front} onUpdate={self => self.layers.set(VESSEL_LAYER)} />
      <mesh geometry={geometry} material={materials.behind} onUpdate={self => self.layers.set(VESSEL_BEHIND_LAYER)} />
    </>
  )
}
