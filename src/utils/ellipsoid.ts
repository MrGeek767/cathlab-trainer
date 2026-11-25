type Vec3 = [number, number, number]

export interface Ellipsoid {
  center: Vec3
  /** Unit axes, longest first, forming a right-handed set. */
  axes: [Vec3, Vec3, Vec3]
  /** Semi-axis lengths, matching `axes`. */
  radii: Vec3
}

/**
 * Eigenvalues and eigenvectors of a symmetric 3×3 matrix by Jacobi rotations.
 * `vectors[k]` is the eigenvector (as a column of the rotation) for `values[k]`.
 */
function symmetricEigen(matrix: number[][]): { values: number[]; vectors: number[][] } {
  const a = matrix.map(row => [...row])
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  for (let sweep = 0; sweep < 64; sweep++) {
    let p = 0
    let q = 1
    let largest = Math.abs(a[0]![1]!)
    if (Math.abs(a[0]![2]!) > largest) [p, q, largest] = [0, 2, Math.abs(a[0]![2]!)]
    if (Math.abs(a[1]![2]!) > largest) [p, q, largest] = [1, 2, Math.abs(a[1]![2]!)]
    if (largest < 1e-14) break

    const apq = a[p]![q]!
    const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq)
    const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
    const c = 1 / Math.sqrt(t * t + 1)
    const s = t * c

    a[p]![p] = a[p]![p]! - t * apq
    a[q]![q] = a[q]![q]! + t * apq
    a[p]![q] = 0
    a[q]![p] = 0
    for (let r = 0; r < 3; r++) {
      if (r !== p && r !== q) {
        const arp = a[r]![p]!
        const arq = a[r]![q]!
        a[r]![p] = c * arp - s * arq
        a[p]![r] = a[r]![p]!
        a[r]![q] = s * arp + c * arq
        a[q]![r] = a[r]![q]!
      }
    }
    for (let r = 0; r < 3; r++) {
      const vrp = v[r]![p]!
      const vrq = v[r]![q]!
      v[r]![p] = c * vrp - s * vrq
      v[r]![q] = s * vrp + c * vrq
    }
  }
  const values = [a[0]![0]!, a[1]![1]!, a[2]![2]!]
  const vectors = [0, 1, 2].map(k => [v[0]![k]!, v[1]![k]!, v[2]![k]!])
  return { values, vectors }
}

/**
 * An ellipsoid matching the spread of a point cloud: centre at the mean, axes along
 * the principal directions. For points spread evenly over an ellipsoid's surface the
 * variance along each axis is radius²/3, so radius = √(3 × variance).
 */
export function fitEllipsoid(points: Vec3[]): Ellipsoid {
  const n = Math.max(1, points.length)
  const center: Vec3 = [0, 0, 0]
  for (const p of points) for (let i = 0; i < 3; i++) center[i] = center[i]! + p[i]! / n
  const covariance = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (const p of points) {
    const d = [p[0] - center[0], p[1] - center[1], p[2] - center[2]]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) covariance[i]![j] = covariance[i]![j]! + (d[i]! * d[j]!) / n
  }
  const { values, vectors } = symmetricEigen(covariance)
  const order = [0, 1, 2].sort((i, j) => values[j]! - values[i]!)
  const axes = order.map(k => vectors[k]! as Vec3) as [Vec3, Vec3, Vec3]
  const radii = order.map(k => Math.sqrt(3 * Math.max(0, values[k]!))) as Vec3
  // Keep the axes right-handed, so they can be used directly as a rotation.
  const [a, b, c] = axes
  const cross: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  if (cross[0] * c[0] + cross[1] * c[1] + cross[2] * c[2] < 0) axes[2] = [-c[0], -c[1], -c[2]]
  return { center, axes, radii }
}
