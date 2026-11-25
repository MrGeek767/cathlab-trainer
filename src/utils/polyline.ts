import * as THREE from 'three'

/**
 * Cut a 3D polyline to the part between two fractions of its total length.
 * End points are interpolated, so the slice starts and stops exactly where the
 * fractions fall, however unevenly the input is sampled.
 */
export function slicePolyline3D(points: THREE.Vector3[], from: number, to: number): THREE.Vector3[] {
  if (to - from <= 0.001 || points.length < 2) return []

  const cumulative: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1]! + points[i]!.distanceTo(points[i - 1]!))
  }
  const total = cumulative[cumulative.length - 1]!
  if (total === 0) return []

  const startLen = Math.max(0, from) * total
  const endLen = Math.min(1, to) * total

  const pointAt = (len: number): THREE.Vector3 => {
    for (let i = 1; i < points.length; i++) {
      if (cumulative[i]! >= len) {
        const segLen = cumulative[i]! - cumulative[i - 1]!
        const t = segLen === 0 ? 0 : (len - cumulative[i - 1]!) / segLen
        return points[i - 1]!.clone().lerp(points[i]!, t)
      }
    }
    return points[points.length - 1]!.clone()
  }

  const slice = [pointAt(startLen)]
  for (let i = 0; i < points.length; i++) {
    if (cumulative[i]! > startLen && cumulative[i]! < endLen) slice.push(points[i]!.clone())
  }
  slice.push(pointAt(endLen))
  return slice
}

/**
 * Index range of a TubeGeometry that covers the part of the vessel between two
 * length fractions. TubeGeometry places its rings at equal arc-length steps and
 * stores 6 indices per ring quad, ring after ring, so a fraction maps straight
 * to an index offset. `null` means "draw everything".
 */
export function tubeDrawRange(
  range: { from: number; to: number } | null,
  tubularSegments: number,
  radialSegments: number,
): { start: number; count: number } {
  if (range === null) return { start: 0, count: Infinity }
  if (range.to - range.from <= 0) return { start: 0, count: 0 }
  const perRing = radialSegments * 6
  const first = Math.max(0, Math.floor(range.from * tubularSegments))
  const last = Math.min(tubularSegments, Math.ceil(range.to * tubularSegments))
  return { start: first * perRing, count: Math.max(0, last - first) * perRing }
}
