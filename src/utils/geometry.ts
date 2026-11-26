import * as THREE from 'three'

/** Scale factor: anatomy data is in cm, we use scene units = cm * SCALE */
export const ANATOMY_SCALE = 0.5
/** Real size of one anatomy unit. */
export const ANATOMY_UNIT_MM = 18
/** Millimetres to scene units: one anatomy unit is 18 mm, drawn at ANATOMY_SCALE. */
export const MM_TO_SCENE = ANATOMY_SCALE / ANATOMY_UNIT_MM

// ─── Mesh-based surface projection (used by CoronaryArteries3D) ───

/**
 * Extract the heart GLTF geometry baked into world space for raycasting.
 * Bakes all nested GLTF transforms + the primitive scale into the geometry
 * so the resulting mesh has an identity matrixWorld.
 */
export function extractHeartGeometry(
  gltfScene: THREE.Object3D,
  primitiveScale: number,
): { mesh: THREE.Mesh; center: THREE.Vector3 } {
  // Ensure all world matrices are up to date
  gltfScene.updateMatrixWorld(true)

  // Find the first Mesh in the GLTF scene graph
  let srcMesh: THREE.Mesh | null = null
  gltfScene.traverse((child) => {
    if (!srcMesh && child instanceof THREE.Mesh) {
      srcMesh = child
    }
  })
  if (!srcMesh) throw new Error('No mesh found in GLTF scene')

  // Clone geometry and bake the full world transform into vertices
  const geometry = (srcMesh as THREE.Mesh).geometry.clone()
  geometry.applyMatrix4((srcMesh as THREE.Mesh).matrixWorld)

  // Apply the primitive scale (the <primitive scale={2.2}> wrapper)
  const scaleMat = new THREE.Matrix4().makeScale(primitiveScale, primitiveScale, primitiveScale)
  geometry.applyMatrix4(scaleMat)

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.computeVertexNormals()

  // Create a mesh with identity transform for raycasting
  const bakedMesh = new THREE.Mesh(geometry)
  bakedMesh.updateMatrixWorld(true)

  const center = new THREE.Vector3()
  geometry.boundingBox!.getCenter(center)

  return { mesh: bakedMesh, center }
}

/**
 * Project a point radially onto the heart mesh surface.
 * Casts a ray from far outside the mesh toward the center, through the
 * point's radial direction. Returns the hit point offset along the face normal.
 */
export function projectPointToMeshSurface(
  point: THREE.Vector3,
  raycaster: THREE.Raycaster,
  mesh: THREE.Mesh,
  meshCenter: THREE.Vector3,
  normalOffset: number,
): THREE.Vector3 | null {
  const dir = new THREE.Vector3().subVectors(point, meshCenter)
  if (dir.lengthSq() < 0.0001) return null
  dir.normalize()

  // Ray from far outside, pointing inward toward center
  const origin = new THREE.Vector3().addVectors(meshCenter, dir.clone().multiplyScalar(10))
  const rayDir = dir.clone().negate()

  raycaster.set(origin, rayDir)
  const hits = raycaster.intersectObject(mesh, false)

  if (hits.length === 0) return null

  // hits[0] = nearest to ray origin = outer surface
  const hit = hits[0]!
  const surfacePoint = hit.point.clone()

  // Offset along the face normal to lift artery above the surface
  const face = hit.face
  if (face) {
    surfacePoint.addScaledVector(face.normal, normalOffset)
  }

  return surfacePoint
}

/**
 * Build a spline that follows the heart mesh surface.
 *
 * 1. Project control points onto mesh surface
 * 2. Build initial CatmullRom spline
 * 3. Resample densely and re-project (prevents CatmullRom dipping)
 * 4. Build final surface-following spline
 */
export function buildMeshProjectedArterySpline(
  controlPoints: [number, number, number][],
  raycaster: THREE.Raycaster,
  mesh: THREE.Mesh,
  meshCenter: THREE.Vector3,
  normalOffset: number = 0.03,
): THREE.CatmullRomCurve3 {
  // Step 1: project control points onto mesh surface
  const projected: THREE.Vector3[] = controlPoints.map(([x, y, z]) => {
    const pt = new THREE.Vector3(x * ANATOMY_SCALE, y * ANATOMY_SCALE, z * ANATOMY_SCALE)
    return projectPointToMeshSurface(pt, raycaster, mesh, meshCenter, normalOffset) ?? pt
  })

  // Step 2: initial spline through projected control points
  const initial = new THREE.CatmullRomCurve3(projected, false, 'catmullrom', 0.5)

  // Step 3: resample densely and re-project each sample
  const numSamples = Math.max(40, controlPoints.length * 8)
  const resampled: THREE.Vector3[] = []
  for (let i = 0; i <= numSamples; i++) {
    const pt = initial.getPoint(i / numSamples)
    const surfPt = projectPointToMeshSurface(pt, raycaster, mesh, meshCenter, normalOffset)
    resampled.push(surfPt ?? pt)
  }

  // Step 4: final surface-following spline
  return new THREE.CatmullRomCurve3(resampled, false, 'catmullrom', 0.5)
}

/**
 * Build a smooth spline curve from raw control points.
 * Used by 2D views (ProjectedArteries, FluoroCanvas) — original paths, no surface projection.
 */
export function buildArterySpline(controlPoints: [number, number, number][]): THREE.CatmullRomCurve3 {
  const vectors = controlPoints.map(
    ([x, y, z]) => new THREE.Vector3(x * ANATOMY_SCALE, y * ANATOMY_SCALE, z * ANATOMY_SCALE)
  )
  return new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.5)
}

/**
 * Build a TubeGeometry with tapering radius along the curve.
 * Three.js TubeGeometry doesn't natively support taper, so we modify
 * the geometry positions after creation.
 */
export function buildTaperedTubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  startRadius: number,
  endRadius: number,
  tubularSegments = 64,
  radialSegments = 8,
): THREE.TubeGeometry {
  return buildProfiledTubeGeometry(curve, t => startRadius + (endRadius - startRadius) * t, tubularSegments, radialSegments)
}

/**
 * A tube along `curve` whose radius (mm) at each ring follows `radiusAt(t)`, t being the
 * fraction of the curve's length. Rings sit where TubeGeometry puts them, by arc length.
 */
export function buildProfiledTubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  radiusAt: (t: number) => number,
  tubularSegments = 64,
  radialSegments = 8,
): THREE.TubeGeometry {
  const baseRadius = MM_TO_SCENE
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, baseRadius, radialSegments, false)
  const positions = geometry.attributes.position!
  const center = new THREE.Vector3()
  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments
    const scale = (radiusAt(t) * MM_TO_SCENE) / baseRadius
    curve.getPointAt(t, center)
    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j
      positions.setXYZ(
        idx,
        center.x + (positions.getX(idx) - center.x) * scale,
        center.y + (positions.getY(idx) - center.y) * scale,
        center.z + (positions.getZ(idx) - center.z) * scale,
      )
    }
  }
  positions.needsUpdate = true
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * Store each vertex's local vessel radius (mm) as the `aRadius` attribute, tapering
 * along the tube like its geometry, so contrast density can follow the lumen.
 */
export function addRadiusAttribute(
  geometry: THREE.BufferGeometry,
  startRadiusMm: number,
  endRadiusMm: number,
  tubularSegments = 64,
  radialSegments = 8,
): void {
  addRadiusProfileAttribute(geometry, t => startRadiusMm + (endRadiusMm - startRadiusMm) * t, tubularSegments, radialSegments)
}

/** Store the lumen radius (mm) at each ring as `aRadius`, following `radiusAt(t)`. */
export function addRadiusProfileAttribute(
  geometry: THREE.BufferGeometry,
  radiusAt: (t: number) => number,
  tubularSegments = 64,
  radialSegments = 8,
): void {
  const count = geometry.attributes.position!.count
  const radii = new Float32Array(count)
  for (let i = 0; i <= tubularSegments; i++) {
    const r = radiusAt(i / tubularSegments)
    for (let j = 0; j <= radialSegments; j++) {
      const index = i * (radialSegments + 1) + j
      if (index < count) radii[index] = r
    }
  }
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1))
}

/**
 * The curve with a straight run added before its start and after its end, along the
 * end tangents. Neighbouring vessel segments meet at an angle, each tube ending square
 * to its own course; a short overlap closes the seam that would otherwise show.
 */
export function extendCurveEnds(
  curve: THREE.Curve<THREE.Vector3>,
  startLength: number,
  endLength: number,
): THREE.Curve<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>()
  const start = curve.getPointAt(0)
  const end = curve.getPointAt(1)
  if (startLength > 0) {
    path.add(new THREE.LineCurve3(start.clone().addScaledVector(curve.getTangentAt(0), -startLength), start))
  }
  path.add(curve)
  if (endLength > 0) {
    path.add(new THREE.LineCurve3(end, end.clone().addScaledVector(curve.getTangentAt(1), endLength)))
  }
  return path
}

/**
 * Store the vessel's direction at each ring as the `aAxis` attribute, so the shader can
 * tell how far the vessel turns toward the beam (foreshortening).
 */
export function addAxisAttribute(geometry: THREE.TubeGeometry, tubularSegments = 64, radialSegments = 8): void {
  const count = geometry.attributes.position!.count
  const axes = new Float32Array(count * 3)
  for (let i = 0; i <= tubularSegments; i++) {
    const tangent = geometry.tangents[i]
    if (!tangent) continue
    for (let j = 0; j <= radialSegments; j++) {
      const index = i * (radialSegments + 1) + j
      if (index < count) tangent.toArray(axes, index * 3)
    }
  }
  geometry.setAttribute('aAxis', new THREE.BufferAttribute(axes, 3))
}
