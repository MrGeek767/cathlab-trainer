import { useEffect, useRef } from 'react'

/** Dragging moves the device this far per pixel... */
export const DRAG_MM_PER_PX = 0.08
/** ...but never faster than this, as a hand on the catheter would. */
export const MAX_PUSH_MM_PER_S = 25

/**
 * Moves the device in hand from the monitor (plan Task 10): drag right or up to push it
 * in, left or down to pull it back. While the monitor has focus, ↑ and ↓ push and pull
 * 1 mm, I opens the inflation device and space injects contrast.
 */
export function useDevicePush(options: {
  enabled: boolean
  onMove: (deltaMm: number) => void
  onInflate: () => void
  onInject: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let dragging = false
    let last = { x: 0, y: 0 }
    let lastTime = 0

    const down = (e: PointerEvent) => {
      if (!latest.current.enabled) return
      if ((e.target as HTMLElement | null)?.closest?.('[data-no-drag]')) return
      dragging = true
      last = { x: e.clientX, y: e.clientY }
      lastTime = performance.now()
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging || !latest.current.enabled) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      last = { x: e.clientX, y: e.clientY }
      const now = performance.now()
      const seconds = Math.max((now - lastTime) / 1000, 1 / 240)
      lastTime = now
      const cap = MAX_PUSH_MM_PER_S * seconds
      const mm = Math.min(Math.max((dx - dy) * DRAG_MM_PER_PX, -cap), cap)
      if (mm !== 0) latest.current.onMove(mm)
    }
    const up = (e: PointerEvent) => {
      dragging = false
      el.releasePointerCapture?.(e.pointerId)
    }
    const key = (e: KeyboardEvent) => {
      if (!latest.current.enabled || e.target !== el) return
      if (e.key === 'ArrowUp') latest.current.onMove(1)
      else if (e.key === 'ArrowDown') latest.current.onMove(-1)
      else if (e.key === 'i' || e.key === 'I') latest.current.onInflate()
      else if (e.key === ' ') latest.current.onInject()
      else return
      e.preventDefault()
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('keydown', key)
    }
  }, [])

  return { containerRef }
}
