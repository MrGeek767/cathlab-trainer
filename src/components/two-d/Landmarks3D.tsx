import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ANATOMY_SCALE, MM_TO_SCENE } from '@/utils/geometry'
import { SPINE, DOMES, DOME_SEMI_X, DOME_SEMI_Z, DOME_DROP } from '@/utils/landmarks'
import { densityMaterial, BODY_LAYER } from './density'

const onBodyLayer = (object: THREE.Object3D) => object.layers.set(BODY_LAYER)

/**
 * The spine and the diaphragm as X-ray densities. They use the shapes in
 * utils/landmarks.ts (tested there) and sit in the same 3D scene as the vessels, so
 * they follow the C-arm exactly.
 */
export const LANDMARK_DENSITY = {
  /** Per surface; the spine's front and back add up. */
  spine: 0.26,
  /** The liver and abdomen under each dome. */
  dome: 0.34,
} as const

/** Vertebral body plus disc, repeating down the spine. */
const VERTEBRA_MM = 30

/** Depth of the abdomen below each dome, and the curve that turns the dome's edge downward (unit-dome sizes). */
const SKIRT_DEPTH = 20
const ROLL = 0.15

/** Unit dome profile: the paraboloid cap, a short curve that turns its edge straight down, then the skirt. */
function domeProfile(): THREE.Vector2[] {
  const cap = [0, 0.25, 0.5, 0.75, 1].map(r => new THREE.Vector2(r, -DOME_DROP * r * r))
  const rimSlope = 2 * DOME_DROP
  const roll = new THREE.QuadraticBezierCurve(
    new THREE.Vector2(1, -DOME_DROP),
    new THREE.Vector2(1 + ROLL, -DOME_DROP - rimSlope * ROLL),
    new THREE.Vector2(1 + ROLL, -DOME_DROP - 2 * rimSlope * ROLL),
  )
    .getPoints(6)
    .slice(1)
  return [...cap, ...roll, new THREE.Vector2(1 + ROLL, -DOME_DROP - SKIRT_DEPTH)]
}

export function Landmarks3D() {
  const domeGeometry = useMemo(() => new THREE.LatheGeometry(domeProfile(), 48), [])
  // Max blending: where the two domes overlap, the abdomen is not counted twice.
  const domeMaterial = useMemo(
    () => densityMaterial({ density: LANDMARK_DENSITY.dome, blend: 'max', doubleSided: true }),
    [],
  )
  const spineMaterial = useMemo(
    () =>
      densityMaterial({
        density: LANDMARK_DENSITY.spine,
        horizontal: true,
        doubleSided: true,
        discs: VERTEBRA_MM * MM_TO_SCENE,
      }),
    [],
  )
  useEffect(
    () => () => {
      domeGeometry.dispose()
      domeMaterial.dispose()
      spineMaterial.dispose()
    },
    [domeGeometry, domeMaterial, spineMaterial],
  )

  const spineRadius = (SPINE.width / 2) * ANATOMY_SCALE
  const spineHeight = (SPINE.yTop - SPINE.yBottom) * ANATOMY_SCALE
  const spineY = ((SPINE.yTop + SPINE.yBottom) / 2) * ANATOMY_SCALE

  return (
    <group>
      {/* Domes draw first: max blending needs the empty buffer under them. */}
      {DOMES.map(dome => (
        <mesh
          key={dome.side}
          geometry={domeGeometry}
          material={domeMaterial}
          position={[dome.apex[0] * ANATOMY_SCALE, dome.apex[1] * ANATOMY_SCALE, dome.apex[2] * ANATOMY_SCALE]}
          scale={[DOME_SEMI_X * ANATOMY_SCALE, ANATOMY_SCALE, DOME_SEMI_Z * ANATOMY_SCALE]}
          renderOrder={-10}
          onUpdate={onBodyLayer}
        />
      ))}
      <mesh position={[SPINE.x * ANATOMY_SCALE, spineY, SPINE.z * ANATOMY_SCALE]} material={spineMaterial} renderOrder={-2} onUpdate={onBodyLayer}>
        <cylinderGeometry args={[spineRadius, spineRadius, spineHeight, 48, 1, true]} />
      </mesh>
    </group>
  )
}
