import { useRef, useEffect, useCallback } from 'react'

interface UseDragRotationProps {
  adjustRaoLao: (delta: number) => void
  adjustCranialCaudal: (delta: number) => void
  sensitivity?: number
  /** Off in the Cath lab, where dragging the monitor moves the device instead. Default true. */
  enabled?: boolean
}

export function useDragRotation({
  adjustRaoLao,
  adjustCranialCaudal,
  sensitivity = 0.3,
  enabled = true,
}: UseDragRotationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledRef.current = enabled
    const el = containerRef.current
    if (el) el.style.cursor = enabled ? 'grab' : ''
  }, [enabled])
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (!enabledRef.current) return
    // Don't start drag if clicking on interactive overlay elements
    const target = e.target as HTMLElement
    if (target.closest('[data-no-drag]')) return

    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    const el = containerRef.current
    if (el) {
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    adjustRaoLao(-dx * sensitivity)
    adjustCranialCaudal(dy * sensitivity)
  }, [adjustRaoLao, adjustCranialCaudal, sensitivity])

  const onPointerUp = useCallback((e: PointerEvent) => {
    dragging.current = false
    const el = containerRef.current
    if (el) {
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
      el.style.cursor = enabledRef.current ? 'grab' : ''
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.style.cursor = enabledRef.current ? 'grab' : ''
    el.style.touchAction = 'none'
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [onPointerDown, onPointerMove, onPointerUp])

  return { containerRef }
}
