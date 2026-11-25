import { useEffect, useRef } from 'react'

/** First injection after a question appears, and the pause between runs. */
export const LOOP_FIRST_DELAY_MS = 400
export const LOOP_GAP_MS = 1000

/**
 * Keeps injecting while `active`: shortly after it turns on, then a moment after each
 * run ends. Used in real fluoro, where an artery can only be named while it holds
 * contrast, so the question keeps replaying its cine.
 */
export function useInjectionLoop(active: boolean, playing: boolean, play: () => void): void {
  const latestPlay = useRef(play)
  const runs = useRef(0)
  useEffect(() => {
    latestPlay.current = play
  })
  useEffect(() => {
    if (!active) runs.current = 0
  }, [active])
  useEffect(() => {
    if (!active || playing) return
    const timer = setTimeout(
      () => {
        runs.current += 1
        latestPlay.current()
      },
      runs.current === 0 ? LOOP_FIRST_DELAY_MS : LOOP_GAP_MS,
    )
    return () => clearTimeout(timer)
  }, [active, playing])
}
