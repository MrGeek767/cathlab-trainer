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
import {
  CINE_FRAME_MS,
  CORONARY_SYSTOLIC_DAMPING,
  HEART_RATE,
  cineFrameTime,
  clockTimeForFlowMs,
  flowTimeMs,
} from '@/utils/cardiac-cycle'

export interface CineFrame {
  /** 1 for the first frame of the run. */
  index: number
  total: number
}

interface Run {
  start: number
  end: number
  frames: number
}

const NO_CONTRAST = new Map<string, OpaqueRange>()

/**
 * Plays one contrast run, as cine: a new image every 1/15 s, on the same clock as the
 * heart's motion. Contrast follows coronary flow time, so it surges forward in
 * diastole, and the run lasts a set number of beats (see CINE_BEATS).
 *
 * While playing, `opacity` holds the opaque part of every segment for the current
 * frame (empty before contrast arrives) and `frame` the frame number; when idle both
 * are `null` and the normal road-map view shows. Changing the tree (dominance) or the
 * injection side stops the run, so a run never mixes two anatomies.
 */
export function useCineRun(
  tree: VesselTree,
  side: InjectionSide,
  timing: CineTiming = DEFAULT_CINE_TIMING,
  heartRate: number = HEART_RATE,
) {
  const [run, setRun] = useState<Run | null>(null)
  const [shown, setShown] = useState<{ opacity: Map<string, OpaqueRange>; frame: CineFrame } | null>(null)
  const animation = useRef(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(animation.current)
    setRun(null)
    setShown(null)
  }, [])

  const play = useCallback(() => {
    const start = performance.now()
    const damping = CORONARY_SYSTOLIC_DAMPING[side]
    const end = start + clockTimeForFlowMs(start, cineDurationMs(timing), heartRate, damping)
    const frames = Math.round((cineFrameTime(end) - cineFrameTime(start)) / CINE_FRAME_MS) + 1
    setShown(null)
    setRun({ start, end, frames })
  }, [side, timing, heartRate])

  // A new anatomy or injection side ends any run in progress.
  useEffect(() => {
    cancelAnimationFrame(animation.current)
    setRun(null)
    setShown(null)
  }, [tree, side])

  useEffect(() => {
    if (run === null) return
    const damping = CORONARY_SYSTOLIC_DAMPING[side]
    const firstFrame = cineFrameTime(run.start)
    let lastIndex = -1
    const tick = (now: number) => {
      if (now >= run.end) {
        setRun(null)
        setShown(null)
        return
      }
      const frameTime = cineFrameTime(now)
      const index = Math.round((frameTime - firstFrame) / CINE_FRAME_MS)
      if (index !== lastIndex) {
        lastIndex = index
        const t = flowTimeMs(frameTime, heartRate, damping) - flowTimeMs(run.start, heartRate, damping)
        setShown({
          opacity: opacificationAt(tree, side, Math.max(0, t), timing),
          frame: { index: Math.min(index + 1, run.frames), total: run.frames },
        })
      }
      animation.current = requestAnimationFrame(tick)
    }
    animation.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animation.current)
  }, [run, tree, side, timing, heartRate])

  // Only a run in progress has an opacity map. A frame that lands between a reset and
  // React's next render can still write one, so idle always reads as null.
  return {
    playing: run !== null,
    opacity: run === null ? null : (shown?.opacity ?? NO_CONTRAST),
    frame: run === null ? null : (shown?.frame ?? { index: 1, total: run.frames }),
    play,
    stop,
  }
}
