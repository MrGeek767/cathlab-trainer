import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/utils/motion'
import { sweepSamples } from './ecg-sweep'

/** About three seconds across, like a bedside monitor at its usual sweep speed. */
const WINDOW_MS = 3000
const ECG_GREEN = '#39D98A'

/**
 * The patient's ECG, sweeping along the bottom of the monitor in step with the heart's
 * motion and the cine clock: the coronaries move after each R wave. With reduced motion
 * the trace is drawn once and stays still.
 */
export function EcgTrace({ heartRate, className = '' }: { heartRate: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const still = prefersReducedMotion()
    let animation = 0
    const draw = (now: number) => {
      const ratio = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      const columns = Math.max(2, Math.round(width))
      const samples = sweepSamples(now, WINDOW_MS, columns, heartRate)
      context.strokeStyle = ECG_GREEN
      context.lineWidth = 1.5
      context.lineJoin = 'round'
      context.shadowColor = 'rgba(57, 217, 138, 0.55)'
      context.shadowBlur = 4
      context.beginPath()
      let drawing = false
      samples.forEach((value, x) => {
        if (value === null) {
          drawing = false
          return
        }
        const y = height * 0.74 - value * height * 0.62
        if (drawing) context.lineTo(x, y)
        else context.moveTo(x, y)
        drawing = true
      })
      context.stroke()
      if (!still) animation = requestAnimationFrame(draw)
    }
    animation = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animation)
  }, [heartRate])

  return <canvas ref={canvasRef} aria-hidden className={className} />
}
