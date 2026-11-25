import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Measures the element marked data-active="true" inside a container, so a highlight
 * can slide to it. Re-measures when the active key changes or the container resizes.
 */
export function useSlidingIndicator<T extends HTMLElement>(activeKey: string) {
  const containerRef = useRef<T>(null)
  const [box, setBox] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const measure = () => {
      const active = container.querySelector<HTMLElement>('[data-active="true"]')
      setBox(active ? { left: active.offsetLeft, width: active.offsetWidth } : null)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(container)
    return () => observer?.disconnect()
  }, [activeKey])

  return { containerRef, box }
}

/** Index of the option an arrow key moves to, wrapping at the ends; null for other keys. */
export function arrowTarget(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count
  return null
}
