import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import type { InjectionSide } from '@/utils/contrast'
import { catheterMotionWeight, catheterPath } from '@/utils/catheter'
import { MM_TO_SCENE, addAxisAttribute, addRadiusAttribute, buildTaperedTubeGeometry } from '@/utils/geometry'
import { heartMatrixAt, type HeartFrame } from '@/utils/heart-motion'
import { CONTRAST_ATTENUATION_PER_MM, VESSEL_BEHIND_LAYER, VESSEL_LAYER, lumenMaterial } from './density'

/** A 6 French guide catheter: 2 mm across. */
const CATHETER_RADIUS_MM = 1
/** Braided wall and a contrast-filled lumen: a little denser than a vessel its size. */
const CATHETER_DENSITY = 1.3
const RINGS = 48
const SIDES = 8

/**
 * The guide catheter seated in the coronary being injected, drawn like a vessel so it
 * shows in real fluoro between runs (where to look) and contrast leaves its tip. Its tip
 * rides on the beating heart while the shaft up the aorta stays still (aHeartWeight).
 * Never picked: it lives only on the vessel render layers, not layer 0.
 */
export function GuideCatheter({
  segments,
  side,
  heart,
  beating,
  heartRate,
}: {
  segments: ArterySegment[]
  side: InjectionSide
  heart: HeartFrame
  beating: boolean
  heartRate: number
}) {
  const geometry = useMemo(() => {
    const path = catheterPath(segments, side)
    if (!path) return null
    const tube = buildTaperedTubeGeometry(path, CATHETER_RADIUS_MM, CATHETER_RADIUS_MM, RINGS, SIDES)
    addRadiusAttribute(tube, CATHETER_RADIUS_MM, CATHETER_RADIUS_MM, RINGS, SIDES)
    addAxisAttribute(tube, RINGS, SIDES)
    // Rings are evenly spaced by length from the tip, so each ring's distance is known.
    const lengthMm = path.getLength() / MM_TO_SCENE
    const weights = new Float32Array(tube.attributes.position!.count)
    for (let i = 0; i <= RINGS; i++) {
      const weight = catheterMotionWeight((i / RINGS) * lengthMm)
      for (let j = 0; j <= SIDES; j++) weights[i * (SIDES + 1) + j] = weight
    }
    tube.setAttribute('aHeartWeight', new THREE.BufferAttribute(weights, 1))
    return tube
  }, [segments, side])
  const materials = useMemo(() => {
    const front = lumenMaterial('front', { heartWeighted: true })
    const behind = lumenMaterial('behind', { heartWeighted: true })
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
  useFrame(() => {
    const pose = materials.front.uniforms.uHeart!.value as THREE.Matrix4
    heartMatrixAt(heart, performance.now(), { beating, heartRate, stepped: true }, pose)
    ;(materials.behind.uniforms.uHeart!.value as THREE.Matrix4).copy(pose)
  })
  if (!geometry) return null
  return (
    <>
      <mesh geometry={geometry} material={materials.front} onUpdate={self => self.layers.set(VESSEL_LAYER)} />
      <mesh geometry={geometry} material={materials.behind} onUpdate={self => self.layers.set(VESSEL_BEHIND_LAYER)} />
    </>
  )
}
