import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ArterySegment } from '@/types/anatomy'
import { ANATOMY_SCALE, MM_TO_SCENE, buildArterySpline } from '@/utils/geometry'
import { fitEllipsoid } from '@/utils/ellipsoid'
import { RIB_LEVELS, RIB_RADIUS_MM, ribPoints } from '@/utils/ribs'
import { densityMaterial, BODY_LAYER } from './density'

const onBodyLayer = (object: THREE.Object3D) => object.layers.set(BODY_LAYER)

/**
 * Densities of the body around the coronaries, for the fluoro view. Calibrated by eye
 * against cine images: lungs bright, cardiac shadow mid grey, bone a little darker,
 * contrast near black.
 */
export const BODY_DENSITY = {
  /** Per surface of the closed heart shape; front and back add up. */
  heart: 0.21,
  /** Per wall of the ascending aorta. */
  aorta: 0.11,
  rib: 0.075,
} as const

/** How far the cardiac shadow reaches beyond the spread of the coronaries on its surface. */
const HEART_FIT = 1.12

/**
 * The cardiac silhouette: a smooth soft-tissue ellipsoid fitted to the coronary tree,
 * so it lies under the vessels in every dominance. (The 3D model shows valves and
 * great-vessel walls inside it, which an angiogram never does.)
 */
export function HeartShadow({ segments }: { segments: ArterySegment[] }) {
  const ellipsoid = useMemo(() => {
    const points = segments.flatMap(segment =>
      buildArterySpline(segment.controlPoints)
        .getSpacedPoints(12)
        .map(p => [p.x, p.y, p.z] as [number, number, number]),
    )
    return fitEllipsoid(points)
  }, [segments])
  const geometry = useMemo(() => organicShape(), [])
  const material = useMemo(() => densityMaterial({ density: BODY_DENSITY.heart, doubleSided: true }), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  const [a, b, c] = ellipsoid.axes.map(axis => new THREE.Vector3(...axis))
  const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(a!, b!, c!))
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={ellipsoid.center}
      quaternion={rotation}
      scale={ellipsoid.radii.map(r => r * HEART_FIT) as [number, number, number]}
      renderOrder={-2}
      onUpdate={onBodyLayer}
    />
  )
}

/**
 * A unit sphere with gentle, fixed bulges, so the silhouette reads as an organ rather
 * than a perfect ellipse. Vertices are merged first so the normals stay smooth across
 * the sphere's seam.
 */
function organicShape(): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, 64, 40)
  sphere.deleteAttribute('uv')
  sphere.deleteAttribute('normal')
  const shape = mergeVertices(sphere)
  sphere.dispose()
  const position = shape.attributes.position!
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const around = Math.atan2(z, x)
    const down = Math.acos(THREE.MathUtils.clamp(y, -1, 1))
    const ring = Math.sin(down)
    const bulge =
      1 + 0.07 * Math.sin(2 * around + 0.6) * ring + 0.05 * Math.cos(3 * down + 0.4) + 0.04 * Math.sin(3 * around - 1.1) * ring * ring
    position.setXYZ(i, x * bulge, y * bulge, z * bulge)
  }
  shape.computeVertexNormals()
  return shape
}

/** Ascending aorta, as drawn: about 28 mm across. */
const AORTA_RADIUS_MM = 14

/**
 * The aortic root and ascending aorta, rising from between the left main and RCA
 * origins toward the head, a little to the patient's right and forward.
 */
export function AorticRoot({ segments }: { segments: ArterySegment[] }) {
  const geometry = useMemo(() => {
    const lm = segments.find(s => s.id === 'lm')?.controlPoints[0]
    const rca = segments.find(s => s.id === 'prox-rca')?.controlPoints[0]
    if (!lm || !rca) return null
    const root = new THREE.Vector3(...lm).add(new THREE.Vector3(...rca)).multiplyScalar(ANATOMY_SCALE / 2)
    const up = new THREE.Vector3(-0.22, 1, 0.12).normalize()
    const points = [
      root.clone().addScaledVector(up, -0.35),
      root.clone().addScaledVector(up, 1.2),
      root.clone().addScaledVector(up, 2.6).add(new THREE.Vector3(-0.1, 0, 0)),
      root.clone().addScaledVector(up, 4).add(new THREE.Vector3(-0.15, 0.1, -0.2)),
    ]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, AORTA_RADIUS_MM * MM_TO_SCENE, 24, false)
  }, [segments])
  const material = useMemo(() => densityMaterial({ density: BODY_DENSITY.aorta, doubleSided: true }), [])
  useEffect(
    () => () => {
      geometry?.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  if (!geometry) return null
  return <mesh geometry={geometry} material={material} renderOrder={-2} onUpdate={onBodyLayer} />
}

/** Faint ribs on both sides, sloping down from the spine. */
export function Ribs() {
  const geometries = useMemo(
    () =>
      RIB_LEVELS.flatMap(level =>
        (['left', 'right'] as const).map(side => {
          const points = ribPoints(side, level).map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(ANATOMY_SCALE))
          return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, RIB_RADIUS_MM * MM_TO_SCENE, 8, false)
        }),
      ),
    [],
  )
  const material = useMemo(() => densityMaterial({ density: BODY_DENSITY.rib }), [])
  useEffect(
    () => () => {
      geometries.forEach(geometry => geometry.dispose())
      material.dispose()
    },
    [geometries, material],
  )
  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={material} renderOrder={-2} onUpdate={onBodyLayer} />
      ))}
    </group>
  )
}
