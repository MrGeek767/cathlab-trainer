import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArterySegment } from '@/types/anatomy'
import type { ViewMode } from '@/types/angles'
import type { OpaqueRange } from '@/utils/contrast'
import { anglesToPosition } from '@/utils/carm-math'
import { ProjectedArteries } from './ProjectedArteries'
import { MonitorOverlay } from './MonitorOverlay'
import { Landmarks3D, FLUORO_BACKGROUND } from './Landmarks3D'

interface Scene2DProps {
  segments: ArterySegment[]
  raoLao: number
  cranialCaudal: number
  viewMode: ViewMode
  hoveredSegmentId: string | null
  onHoverSegment: (id: string | null) => void
  onClickSegment: (id: string) => void
  realism: boolean
  invertLut: boolean
  showLabels: boolean
  /** Opaque part of each segment during a cine run; null shows the full road map. */
  opacity?: Map<string, OpaqueRange> | null
}

function CameraController({
  raoLao,
  cranialCaudal,
  zoom,
}: {
  raoLao: number
  cranialCaudal: number
  zoom: number
}) {
  const targetPos = useRef(new THREE.Vector3(0, 0, 50))

  useFrame(({ camera, size }) => {
    const newPos = anglesToPosition(raoLao, cranialCaudal, 50)
    targetPos.current.lerp(newPos, 0.15)
    camera.position.copy(targetPos.current)
    camera.lookAt(0, 0, 0)
    // Scale zoom to viewport — calibrated for 500px panels on desktop
    const minDim = Math.min(size.width, size.height)
    const scale = Math.min(minDim / 500, 1)
    ;(camera as THREE.OrthographicCamera).zoom = zoom * scale
    camera.updateProjectionMatrix()
  })

  return null
}

export function Scene2D({
  segments,
  raoLao,
  cranialCaudal,
  viewMode,
  hoveredSegmentId,
  onHoverSegment,
  onClickSegment,
  realism: _realism,
  invertLut,
  showLabels,
  opacity = null,
}: Scene2DProps) {
  const isFluoro = viewMode === 'fluoroscopy'

  return (
    <div
      className="w-full h-full"
      style={isFluoro ? {
        overflow: 'hidden',
        margin: 'auto',
        aspectRatio: '1',
        maxHeight: '100%',
        maxWidth: '100%',
        position: 'relative',
        filter: invertLut ? 'invert(1)' : undefined,
      } : undefined}
    >
      <Canvas
        orthographic
        dpr={[1, 2]}
        camera={{
          zoom: 120,
          near: 0.1,
          far: 200,
          position: [0, 0, 50],
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[isFluoro ? FLUORO_BACKGROUND : '#f0f0ec']} />
        <CameraController raoLao={raoLao} cranialCaudal={cranialCaudal} zoom={isFluoro ? 120 : 50} />
        <ambientLight intensity={1.0} />
        {isFluoro && <Landmarks3D />}
        <ProjectedArteries
          segments={segments}
          viewMode={viewMode}
          hoveredSegmentId={hoveredSegmentId}
          onHoverSegment={onHoverSegment}
          onClickSegment={onClickSegment}
          showLabels={showLabels}
          opacity={opacity}
        />
      </Canvas>

      {isFluoro && (
        <MonitorOverlay raoLao={raoLao} cranialCaudal={cranialCaudal} />
      )}
    </div>
  )
}
