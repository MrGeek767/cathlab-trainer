import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { cineFrameTime, contractionAt } from '@/utils/cardiac-cycle'
import { heartMotionMatrix, type HeartFrame } from '@/utils/heart-motion'

/**
 * Moves its children with the beating heart (the coronaries, the cardiac shadow, the
 * 3D model). On the fluoro monitor the image updates at the pulse rate (15 per second),
 * on the same clock as the cine, so the motion steps the way it does on a real monitor;
 * the 3D model moves smoothly (`stepped` false).
 */
export function HeartMotion({
  frame,
  beating,
  heartRate,
  stepped = true,
  children,
}: {
  frame: HeartFrame
  beating: boolean
  heartRate: number
  stepped?: boolean
  children: ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const now = performance.now()
    const contraction = beating ? contractionAt(stepped ? cineFrameTime(now) : now, heartRate) : 0
    heartMotionMatrix(frame, contraction, g.matrix)
    g.matrixWorldNeedsUpdate = true
  })
  return (
    <group ref={group} matrixAutoUpdate={false}>
      {children}
    </group>
  )
}
