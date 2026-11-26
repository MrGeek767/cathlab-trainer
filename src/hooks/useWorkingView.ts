import { useEffect, useRef } from 'react'
import { PRACTICE_WORKING_VIEW } from '@/practice/app-rules'

/**
 * The first time the Cath lab opens, the operator sets the working view, as in the lab.
 * After that the C-arm is the learner's, so coming back to the tab never moves it.
 */
export function useWorkingView(active: boolean, animateTo: (view: { raoLao: number; cranialCaudal: number }) => void) {
  const done = useRef(false)
  useEffect(() => {
    if (!active || done.current) return
    done.current = true
    animateTo(PRACTICE_WORKING_VIEW)
  }, [active, animateTo])
}
