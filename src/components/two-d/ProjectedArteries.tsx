import { useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { ArterySegment } from '@/types/anatomy'
import type { ViewMode } from '@/types/angles'
import { buildArterySpline, buildTaperedTubeGeometry } from '@/utils/geometry'
import { tubeDrawRange } from '@/utils/polyline'
import type { OpaqueRange } from '@/utils/contrast'

// buildTaperedTubeGeometry defaults: 64 rings × 8 sides
const TUBULAR_SEGMENTS = 64
const RADIAL_SEGMENTS = 8

interface ProjectedArteriesProps {
  segments: ArterySegment[]
  viewMode: ViewMode
  hoveredSegmentId: string | null
  onHoverSegment: (id: string | null) => void
  onClickSegment: (id: string) => void
  showLabels?: boolean
  /** Opaque part of each segment during a cine run; null shows the full road map. */
  opacity?: Map<string, OpaqueRange> | null
  /**
   * A challenge target: drawn strongly, the rest dimmed, with no labels and no hover,
   * so the name cannot be read off the screen.
   */
  highlightSegmentId?: string | null
}

type Tone = 'strong' | 'normal' | 'dim'

function ProjectedArtery({
  segment,
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
  viewMode: ViewMode
  isHovered: boolean
  tone: Tone
  labelsAllowed: boolean
  showLabels?: boolean
  range: OpaqueRange | null
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  onClick?: () => void
}) {
  const { geometry, midpoint } = useMemo(() => {
    const curve = buildArterySpline(segment.controlPoints)
    const geo = buildTaperedTubeGeometry(
      curve,
      segment.startRadius * 1.2,
      segment.endRadius * 1.2,
    )
    const mid = curve.getPoint(0.5)
    return { geometry: geo, midpoint: mid }
  }, [segment])

  const drawRange = tubeDrawRange(range, TUBULAR_SEGMENTS, RADIAL_SEGMENTS)
  useLayoutEffect(() => {
    geometry.setDrawRange(drawRange.start, drawRange.count)
  }, [geometry, drawRange.start, drawRange.count])

  const isFluoro = viewMode === 'fluoroscopy'
  const visible = drawRange.count > 0

  return (
    <group>
      <mesh
        geometry={geometry}
        onPointerEnter={onPointerEnter && ((e) => { e.stopPropagation(); onPointerEnter() })}
        onPointerLeave={onPointerLeave}
        onClick={onClick && ((e) => { e.stopPropagation(); onClick() })}
      >
        {isFluoro ? (
          <meshBasicMaterial
            color={tone === 'strong' ? '#ffffff' : '#cccccc'}
            transparent
            opacity={tone === 'strong' ? 0.95 : tone === 'dim' ? 0.45 : 0.7}
            depthTest={false}
            depthWrite={false}
          />
        ) : (
          <meshBasicMaterial
            color={tone === 'strong' ? segment.color : new THREE.Color(segment.color).multiplyScalar(0.9)}
            transparent={tone === 'dim'}
            opacity={tone === 'dim' ? 0.3 : 1}
            depthTest={false}
            depthWrite={false}
          />
        )}
      </mesh>

      {visible && labelsAllowed && ((viewMode === 'schematic') || isHovered || showLabels) && (
        <Html
          position={[midpoint.x, midpoint.y + 0.12, midpoint.z]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap font-medium ${
              isFluoro
                ? 'bg-black/80 text-white border border-gray-700'
                : 'text-gray-800 bg-white/90 border border-gray-300 shadow-sm'
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
  opacity = null,
  highlightSegmentId = null,
}: ProjectedArteriesProps) {
  const highlighting = highlightSegmentId !== null
  return (
    <group>
      {segments.map(segment => {
        const isHovered = !highlighting && hoveredSegmentId === segment.id
        const tone: Tone = highlighting
          ? segment.id === highlightSegmentId ? 'strong' : 'dim'
          : isHovered ? 'strong' : 'normal'
        return (
          <ProjectedArtery
            key={segment.id}
            segment={segment}
            viewMode={viewMode}
            isHovered={isHovered}
            tone={tone}
            labelsAllowed={!highlighting}
            showLabels={showLabels}
            range={opacity ? opacity.get(segment.id) ?? { from: 0, to: 0 } : null}
            onPointerEnter={highlighting ? undefined : () => onHoverSegment(segment.id)}
            onPointerLeave={highlighting ? undefined : () => onHoverSegment(null)}
            onClick={highlighting ? undefined : () => onClickSegment(segment.id)}
          />
        )
      })}
    </group>
  )
}
