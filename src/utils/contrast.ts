import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import { buildArterySpline, ANATOMY_SCALE } from '@/utils/geometry'
import { ANATOMY_UNIT_MM, segmentLengthMm } from '@/data/segment-sizes'
import { HEART_RATE, beatPeriodMs } from '@/utils/cardiac-cycle'

/**
 * Contrast injection model for cine runs.
 *
 * Contrast enters at the ostium of the injected side, advances along the tree
 * at a constant speed until the longest path is full (fill), stays (hold), then
 * clears from the ostium outward at the same speed (washout). Times here are flow
 * time (see cardiac-cycle.ts), so the column surges forward in diastole.
 */

export type InjectionSide = 'left' | 'right'

export interface VesselNode {
  id: string
  parentId: string | null
  side: InjectionSide
  lengthMm: number
  /** Path distance from the ostium to where this segment begins. */
  startDistanceMm: number
}

export interface VesselTree {
  nodes: Map<string, VesselNode>
  maxPathMm: Record<InjectionSide, number>
}

/** Fractions (0–1) of a segment's length that hold contrast; empty when to − from ≤ 0. */
export interface OpaqueRange {
  from: number
  to: number
}

export interface CineTiming {
  fillMs: number
  holdMs: number
  washoutMs: number
}

/**
 * A run in heartbeats: contrast reaches the distal vessels in about a beat and a half,
 * the injection holds them full for three, and they clear over two.
 */
export const CINE_BEATS = { fill: 1.5, hold: 3, washout: 2 } as const

export function cineTimingForHeartRate(heartRate: number): CineTiming {
  const beat = beatPeriodMs(heartRate)
  return { fillMs: CINE_BEATS.fill * beat, holdMs: CINE_BEATS.hold * beat, washoutMs: CINE_BEATS.washout * beat }
}

export const DEFAULT_CINE_TIMING: CineTiming = cineTimingForHeartRate(HEART_RATE)

const EMPTY: OpaqueRange = { from: 0, to: 0 }
const PARENT_SAMPLES = 100

/** Which injection fills a segment: the RCA's own territory is the right side. */
export function sideOf(segment: ArterySegment): InjectionSide {
  return segment.territory === 'RCA' ? 'right' : 'left'
}

export function cineDurationMs(timing: CineTiming = DEFAULT_CINE_TIMING): number {
  return timing.fillMs + timing.holdMs + timing.washoutMs
}

/** Parent-first order; variant arrays append overrides at the end, so they are not ordered. */
function parentFirst(segments: ArterySegment[]): ArterySegment[] {
  const byId = new Map(segments.map(s => [s.id, s]))
  const ordered: ArterySegment[] = []
  const placed = new Set<string>()
  const place = (segment: ArterySegment) => {
    if (placed.has(segment.id)) return
    const parent = segment.parentId ? byId.get(segment.parentId) : undefined
    if (parent) place(parent)
    placed.add(segment.id)
    ordered.push(segment)
  }
  segments.forEach(place)
  return ordered
}

/** Distance in mm along the parent's centreline to the point nearest the child's origin. */
function takeoffDistanceMm(parent: ArterySegment, child: ArterySegment): number {
  const curve = buildArterySpline(parent.controlPoints)
  const [cx, cy, cz] = child.controlPoints[0]!
  const origin = new THREE.Vector3(cx * ANATOMY_SCALE, cy * ANATOMY_SCALE, cz * ANATOMY_SCALE)
  let best = 0
  let bestDist = Infinity
  let cumulative = 0
  let previous = curve.getPoint(0)
  for (let i = 0; i <= PARENT_SAMPLES; i++) {
    const point = curve.getPoint(i / PARENT_SAMPLES)
    cumulative += point.distanceTo(previous)
    previous = point
    const dist = point.distanceTo(origin)
    if (dist < bestDist) {
      bestDist = dist
      best = cumulative
    }
  }
  return (best / ANATOMY_SCALE) * ANATOMY_UNIT_MM
}

export function buildVesselTree(segments: ArterySegment[]): VesselTree {
  const nodes = new Map<string, VesselNode>()
  const byId = new Map(segments.map(s => [s.id, s]))
  const maxPathMm: Record<InjectionSide, number> = { left: 0, right: 0 }

  for (const segment of parentFirst(segments)) {
    const parent = segment.parentId ? byId.get(segment.parentId) : undefined
    const parentNode = segment.parentId ? nodes.get(segment.parentId) : undefined
    const startDistanceMm =
      parent && parentNode ? parentNode.startDistanceMm + takeoffDistanceMm(parent, segment) : 0
    const node: VesselNode = {
      id: segment.id,
      parentId: segment.parentId,
      side: sideOf(segment),
      lengthMm: segmentLengthMm(segment),
      startDistanceMm,
    }
    nodes.set(segment.id, node)
    maxPathMm[node.side] = Math.max(maxPathMm[node.side], node.startDistanceMm + node.lengthMm)
  }

  return { nodes, maxPathMm }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function opacificationAt(
  tree: VesselTree,
  side: InjectionSide,
  tMs: number,
  timing: CineTiming = DEFAULT_CINE_TIMING,
): Map<string, OpaqueRange> {
  const { fillMs, holdMs, washoutMs } = timing
  const total = fillMs + holdMs + washoutMs
  const pathMm = tree.maxPathMm[side]
  const result = new Map<string, OpaqueRange>()

  for (const node of tree.nodes.values()) {
    if (node.side !== side || tMs < 0 || tMs > total || node.lengthMm <= 0) {
      result.set(node.id, EMPTY)
    } else if (tMs <= fillMs) {
      const front = (pathMm * tMs) / fillMs
      result.set(node.id, { from: 0, to: clamp01((front - node.startDistanceMm) / node.lengthMm) })
    } else if (tMs <= fillMs + holdMs) {
      result.set(node.id, { from: 0, to: 1 })
    } else {
      const cleared = (pathMm * (tMs - fillMs - holdMs)) / washoutMs
      result.set(node.id, { from: clamp01((cleared - node.startDistanceMm) / node.lengthMm), to: 1 })
    }
  }
  return result
}
