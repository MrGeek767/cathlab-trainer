import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import type { ViewMode } from '@/types/angles'
import type { OpaqueRange } from '@/utils/contrast'
import { anglesToPosition } from '@/utils/carm-math'
import { ProjectedArteries } from './ProjectedArteries'
import { MonitorOverlay } from './MonitorOverlay'
import { Landmarks3D } from './Landmarks3D'
import { AorticRoot, HeartShadow, Ribs } from './BodyShadows'
import { FluoroPipeline, NOISE } from './FluoroPipeline'

/** The diagram's background: dark like the rest of the room, so every artery colour reads. */
export const DIAGRAM_BACKGROUND = '#0E1C2D'

interface Scene2DProps {
  segments: ArterySegment[]
  /** The whole tree for this dominance, whatever the arteries filter shows; shapes the cardiac shadow. */
  anatomy: ArterySegment[]
  raoLao: number
  cranialCaudal: number
  viewMode: ViewMode
  hoveredSegmentId: string | null
  onHoverSegment: (id: string | null) => void
  onClickSegment: (id: string) => void
  /** Contrast shown white on black. */
  invertLut: boolean
  showLabels: boolean
  /** Opaque part of each segment during a cine run; null shows the full road map. */
  opacity?: Map<string, OpaqueRange> | null
  /** Challenge target, drawn highlighted with labels and hover off. */
  highlightSegmentId?: string | null
  /** Overlay readouts. */
  acquiring?: boolean
  cineFrame?: { index: number; total: number } | null
  heartRate?: number
  realFluoro?: boolean
  dominanceLabel?: string
}

/** The monitor's field of view stays the same whatever its size on screen. */
const REFERENCE_SIZE = 500
const MONITOR_ZOOM = 120

function CameraController({ raoLao, cranialCaudal, zoom }: { raoLao: number; cranialCaudal: number; zoom: number }) {
  const targetPos = useRef(new THREE.Vector3(0, 0, 50))

  useFrame(({ camera, size }) => {
    const newPos = anglesToPosition(raoLao, cranialCaudal, 50)
    targetPos.current.lerp(newPos, 0.15)
    camera.position.copy(targetPos.current)
    camera.lookAt(0, 0, 0)
    const minDim = Math.min(size.width, size.height)
    ;(camera as THREE.OrthographicCamera).zoom = zoom * (minDim / REFERENCE_SIZE)
    camera.updateProjectionMatrix()
  })

  return null
}

export function Scene2D({
  segments,
  anatomy,
  raoLao,
  cranialCaudal,
  viewMode,
  hoveredSegmentId,
  onHoverSegment,
  onClickSegment,
  invertLut,
  showLabels,
  opacity = null,
  highlightSegmentId = null,
  acquiring = false,
  cineFrame = null,
  heartRate = 70,
  realFluoro = false,
  dominanceLabel = '',
}: Scene2DProps) {
  const isFluoro = viewMode === 'fluoroscopy'

  return (
    <div className="relative h-full w-full">
      <Canvas
        orthographic
        dpr={[1, 2]}
        camera={{ zoom: 120, near: 0.1, far: 200, position: [0, 0, 50] }}
        gl={{ antialias: true }}
      >
        {!isFluoro && <color attach="background" args={[DIAGRAM_BACKGROUND]} />}
        {/* Same framing in both images, so switching between them keeps the arteries in place. */}
        <CameraController raoLao={raoLao} cranialCaudal={cranialCaudal} zoom={MONITOR_ZOOM} />
        <ambientLight intensity={1.0} />
        {isFluoro && (
          <>
            <FluoroPipeline invert={invertLut} noise={acquiring ? NOISE.cine : NOISE.fluoro} />
            <Landmarks3D />
            <Ribs />
            <HeartShadow segments={anatomy} />
            <AorticRoot segments={anatomy} />
          </>
        )}
        <ProjectedArteries
          segments={segments}
          viewMode={viewMode}
          hoveredSegmentId={hoveredSegmentId}
          onHoverSegment={onHoverSegment}
          onClickSegment={onClickSegment}
          showLabels={showLabels}
          opacity={opacity}
          highlightSegmentId={highlightSegmentId}
        />
      </Canvas>

      <MonitorOverlay
        raoLao={raoLao}
        cranialCaudal={cranialCaudal}
        fluoro={isFluoro}
        acquiring={acquiring}
        frame={cineFrame}
        heartRate={heartRate}
        realFluoro={realFluoro}
        dominanceLabel={dominanceLabel}
      />
    </div>
  )
}
