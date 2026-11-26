import { useEffect, useMemo, useLayoutEffect } from 'react'
import { Html } from '@react-three/drei'
import type * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import type { ViewMode } from '@/types/angles'
import {
  MM_TO_SCENE,
  addAxisAttribute,
  addRadiusProfileAttribute,
  buildArterySpline,
  buildProfiledTubeGeometry,
  extendCurveEnds,
} from '@/utils/geometry'
import { tubeDrawRange } from '@/utils/polyline'
import { buildVesselPaths } from '@/utils/vessel-paths'
import type { OpaqueRange } from '@/utils/contrast'
import { vesselStyle, type VesselTone } from './vessel-style'
import { lumenMaterial, CONTRAST_ATTENUATION_PER_MM, VESSEL_BEHIND_LAYER, VESSEL_LAYER } from './density'

// buildTaperedTubeGeometry defaults: 64 rings × 8 sides
const TUBULAR_SEGMENTS = 64
/** How far each tube runs past its ends, in drawn radii (closes seams at joints up to ~65°). */
const JOINT_OVERLAP = 0.6
const RADIAL_SEGMENTS = 8

interface ProjectedArteriesProps {
  segments: ArterySegment[]
  viewMode: ViewMode
  hoveredSegmentId: string | null
  onHoverSegment: (id: string | null) => void
  onClickSegment: (id: string) => void
  showLabels?: boolean
  /** No names and no hover (a question or an exam is on screen). */
  namesHidden?: boolean
  /** Lumen radius (mm) by distance along the drawn segment, for segments with a lesion. */
  lumens?: ReadonlyMap<string, (mm: number) => number>
  /** Opaque part of each segment during a cine run; null shows the full road map. */
  opacity?: Map<string, OpaqueRange> | null
  /**
   * A challenge target: drawn strongly, the rest dimmed, with no labels and no hover,
   * so the name cannot be read off the screen.
   */
  highlightSegmentId?: string | null
}

function ProjectedArtery({
  segment,
  path,
  lumen,
  viewMode,
  isHovered,
  tone,
  labelsAllowed,
  showLabels,
  range,
  onPointerEnter,
  onPointerLeave,
  onClick,
}: {
  segment: ArterySegment
  /** The drawn centre line (buildVesselPaths); the segment's own spline if absent. */
  path: THREE.Curve<THREE.Vector3> | null
  /** Lumen radius (mm) by distance along the drawn segment, for a narrowed segment. */
  lumen?: (mm: number) => number
  viewMode: ViewMode
  isHovered: boolean
  tone: VesselTone
  labelsAllowed: boolean
  showLabels?: boolean
  range: OpaqueRange | null
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  onClick?: () => void
}) {
  const isFluoro = viewMode === 'fluoroscopy'
  // Fluoro draws vessels at their real width; the diagram draws them bolder for reading.
  const widthFactor = isFluoro ? 1 : 1.5
  const { geometry, midpoint } = useMemo(() => {
    const curve = path ?? buildArterySpline(segment.controlPoints)
    // Each tube runs on a little past its ends so neighbouring segments overlap: no seam.
    const overlap = (radiusMm: number) => radiusMm * widthFactor * MM_TO_SCENE * JOINT_OVERLAP
    const startExtension = overlap(segment.startRadius)
    const extended = extendCurveEnds(curve, startExtension, overlap(segment.endRadius))
    // The lumen radius (mm) at each ring: tapering, or the practice lesion's own profile.
    // Rings are spaced along the extended curve, so measure back to the segment itself.
    const segmentMm = curve.getLength() / MM_TO_SCENE
    const extendedLength = extended.getLength()
    const radiusAt = (t: number) => {
      const mm = Math.min(Math.max((t * extendedLength - startExtension) / MM_TO_SCENE, 0), segmentMm)
      return lumen ? lumen(mm) : segment.startRadius + (segment.endRadius - segment.startRadius) * (mm / segmentMm)
    }
    const geo = buildProfiledTubeGeometry(extended, t => radiusAt(t) * widthFactor, TUBULAR_SEGMENTS, RADIAL_SEGMENTS)
    // The real lumen and course at every vertex, for the contrast density.
    addRadiusProfileAttribute(geo, radiusAt, TUBULAR_SEGMENTS, RADIAL_SEGMENTS)
    addAxisAttribute(geo, TUBULAR_SEGMENTS, RADIAL_SEGMENTS)
    const mid = curve.getPoint(0.5)
    return { geometry: geo, midpoint: mid }
  }, [segment, path, widthFactor, lumen])
  useEffect(() => () => geometry.dispose(), [geometry])

  const contrast = useMemo(() => ({ front: lumenMaterial('front'), behind: lumenMaterial('behind') }), [])
  useEffect(
    () => () => {
      contrast.front.dispose()
      contrast.behind.dispose()
    },
    [contrast],
  )

  const drawRange = tubeDrawRange(range, TUBULAR_SEGMENTS, RADIAL_SEGMENTS)
  useLayoutEffect(() => {
    geometry.setDrawRange(drawRange.start, drawRange.count)
  }, [geometry, drawRange.start, drawRange.count])

  const visible = drawRange.count > 0
  const style = vesselStyle(viewMode, tone, segment.color)
  // Contrast attenuates in proportion to the lumen the beam crosses (see lumenChordMm).
  contrast.front.uniforms.uDensity!.value = CONTRAST_ATTENUATION_PER_MM * style.density
  contrast.behind.uniforms.uDensity!.value = CONTRAST_ATTENUATION_PER_MM * style.density

  return (
    <group>
      {isFluoro ? (
        <>
          <mesh
            key="fluoro"
            geometry={geometry}
            material={contrast.front}
            onUpdate={self => self.layers.enable(VESSEL_LAYER)}
            onPointerEnter={onPointerEnter && ((e) => { e.stopPropagation(); onPointerEnter() })}
            onPointerLeave={onPointerLeave}
            onClick={onClick && ((e) => { e.stopPropagation(); onClick() })}
          />
          {/* Crossing pass only: off layer 0, so it is never drawn directly or picked. */}
          <mesh
            key="fluoro-behind"
            geometry={geometry}
            material={contrast.behind}
            onUpdate={self => self.layers.set(VESSEL_BEHIND_LAYER)}
          />
        </>
      ) : (
        <mesh
          key="diagram"
          geometry={geometry}
          onPointerEnter={onPointerEnter && ((e) => { e.stopPropagation(); onPointerEnter() })}
          onPointerLeave={onPointerLeave}
          onClick={onClick && ((e) => { e.stopPropagation(); onClick() })}
        >
          {/* Depth-tested, so the diagram shows which vessel lies in front; dimmed
              vessels write no depth and never hide a highlighted one. */}
          <meshBasicMaterial
            color={style.color}
            transparent={style.transparent}
            opacity={style.opacity}
            depthTest
            depthWrite={!style.transparent}
          />
        </mesh>
      )}

      {visible && labelsAllowed && ((viewMode === 'schematic') || isHovered || showLabels) && (
        <Html
          position={[midpoint.x, midpoint.y + 0.12, midpoint.z]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap font-medium ${
              isFluoro
                ? 'bg-black/80 text-white border border-line'
                : 'text-ink bg-room/85 border border-line shadow-sm'
            }`}
          >
            {segment.shortName}
          </div>
        </Html>
      )}
    </group>
  )
}

export function ProjectedArteries({
  segments,
  viewMode,
  hoveredSegmentId,
  onHoverSegment,
  onClickSegment,
  showLabels,
  namesHidden = false,
  lumens,
  opacity = null,
  highlightSegmentId = null,
}: ProjectedArteriesProps) {
  const highlighting = highlightSegmentId !== null
  // No names and no hover while a question or an exam is on screen.
  const locked = highlighting || namesHidden
  // Smooth centre lines: each artery bends through its segment joints without a kink.
  const paths = useMemo(() => buildVesselPaths(segments), [segments])
  return (
    <group>
      {segments.map(segment => {
        const isHovered = !locked && hoveredSegmentId === segment.id
        const tone: VesselTone = highlighting
          ? segment.id === highlightSegmentId ? 'target' : 'dim'
          : isHovered ? 'hover' : 'normal'
        return (
          <ProjectedArtery
            key={segment.id}
            segment={segment}
            path={paths.get(segment.id) ?? null}
            lumen={lumens?.get(segment.id)}
            viewMode={viewMode}
            isHovered={isHovered}
            tone={tone}
            labelsAllowed={!locked}
            showLabels={showLabels}
            range={opacity ? opacity.get(segment.id) ?? { from: 0, to: 0 } : null}
            onPointerEnter={locked ? undefined : () => onHoverSegment(segment.id)}
            onPointerLeave={locked ? undefined : () => onHoverSegment(null)}
            onClick={locked ? undefined : () => onClickSegment(segment.id)}
          />
        )
      })}
    </group>
  )
}
