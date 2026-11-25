import { useState, useEffect, useCallback, useRef } from 'react'
import {
  opacificationAt,
  cineDurationMs,
  DEFAULT_CINE_TIMING,
  type CineTiming,
  type InjectionSide,
  type OpaqueRange,
  type VesselTree,
} from '@/utils/contrast'

/**
 * Plays one contrast run. While playing, `opacity` holds the opaque part of
 * every segment for the current frame; when idle it is `null` and the normal
 * road-map view shows. Changing the tree (dominance) or the injection side
 * stops the run, so a run never mixes two anatomies.
 */
export function useCineRun(tree: VesselTree, side: InjectionSide, timing: CineTiming = DEFAULT_CINE_TIMING) {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [opacity, setOpacity] = useState<Map<string, OpaqueRange> | null>(null)
  const frame = useRef(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current)
    setStartTime(null)
    setOpacity(null)
  }, [])

  const play = useCallback(() => {
    setOpacity(null)
    setStartTime(performance.now())
  }, [])

  // A new anatomy or injection side ends any run in progress.
  useEffect(() => {
    cancelAnimationFrame(frame.current)
    setStartTime(null)
    setOpacity(null)
  }, [tree, side])

  useEffect(() => {
    if (startTime === null) return
    const total = cineDurationMs(timing)
    const tick = (now: number) => {
      const t = now - startTime
      if (t > total) {
        setStartTime(null)
        setOpacity(null)
        return
      }
      setOpacity(opacificationAt(tree, side, Math.max(0, t), timing))
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [startTime, tree, side, timing])

  // Only a run in progress has an opacity map. A frame that lands between a reset and
  // React's next render can still write one, so idle always reads as null.
  return { playing: startTime !== null, opacity: startTime === null ? null : opacity, play, stop }
}
