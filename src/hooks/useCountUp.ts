import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * A number that counts up from zero to `target` over `durationMs`, easing out, so a
 * result lands with a little ceremony. With reduced motion it is simply the target.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [still] = useState(prefersReducedMotion)
  const [value, setValue] = useState(still ? target : 0)
  useEffect(() => {
    if (still) {
      setValue(target)
      return
    }
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      setValue(t >= 1 ? target : Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, still])
  return value
}
