import { useMemo, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { SceneLighting } from './SceneLighting'
import { HeartGLTF } from './HeartGLTF'
import { CoronaryArteries3D } from './CoronaryArteries3D'
import { anglesToPosition } from '@/utils/carm-math'
import type { ArterySegment } from '@/types/anatomy'
import { HeartMotion } from '@/components/two-d/HeartMotion'
import { heartFromAnatomy } from '@/utils/heart-motion'
import { HEART_RATE } from '@/utils/cardiac-cycle'

interface Scene3DProps {
  segments: ArterySegment[]
  /** The whole tree for this dominance; the heart's motion is fitted to it. */
  anatomy: ArterySegment[]
  heartbeat: boolean
  hoveredSegmentId: string | null
  selectedSegmentId: string | null
  onHoverSegment: (id: string | null) => void
  onClickSegment: (id: string) => void
  raoLao: number
  cranialCaudal: number
}

function AngleDrivenCamera({
  raoLao,
  cranialCaudal,
}: {
  raoLao: number
  cranialCaudal: number
}) {
  const targetPos = useRef(new THREE.Vector3(0, 0, 6))

  useFrame(({ camera }) => {
    const newPos = anglesToPosition(raoLao, cranialCaudal, 6)
    targetPos.current.lerp(newPos, 0.12)
    camera.position.copy(targetPos.current)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  })

  return null
}

export function Scene3D({
  segments,
  anatomy,
  heartbeat,
  hoveredSegmentId,
  selectedSegmentId,
  onHoverSegment,
  onClickSegment,
  raoLao,
  cranialCaudal,
}: Scene3DProps) {
  const heart = useMemo(() => heartFromAnatomy(anatomy), [anatomy])
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <color attach="background" args={['#0a0a12']} />
      <SceneLighting />
      <AngleDrivenCamera raoLao={raoLao} cranialCaudal={cranialCaudal} />
      <Suspense fallback={
        <Html center>
          <div className="text-ink-faint text-sm animate-pulse">Loading the heart model…</div>
        </Html>
      }>
        <HeartMotion frame={heart.frame} beating={heartbeat} heartRate={HEART_RATE} stepped={false}>
          <HeartGLTF
            style="clay"
            hoveredSegmentId={hoveredSegmentId}
            selectedSegmentId={selectedSegmentId}
            onHoverSegment={onHoverSegment}
            onClickSegment={onClickSegment}
          />
          <CoronaryArteries3D
            segments={segments}
            hoveredSegmentId={hoveredSegmentId}
            selectedSegmentId={selectedSegmentId}
            onHoverSegment={onHoverSegment}
            onClickSegment={onClickSegment}
          />
        </HeartMotion>
      </Suspense>
    </Canvas>
  )
}
