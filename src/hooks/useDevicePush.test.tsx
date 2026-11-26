// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useDevicePush, DRAG_MM_PER_PX } from './useDevicePush'

afterEach(() => vi.restoreAllMocks())

function mount() {
  const onMove = vi.fn()
  const onInflate = vi.fn()
  const onInject = vi.fn()
  function Harness() {
    const { containerRef } = useDevicePush({ enabled: true, onMove, onInflate, onInject })
    return <div ref={containerRef} tabIndex={0} id="monitor" />
  }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(<Harness />))
  const el = host.querySelector('#monitor') as HTMLDivElement
  return { el, onMove, onInflate, onInject, root }
}

const pointer = (type: string, x: number, y: number) =>
  new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }) as unknown as PointerEvent

describe('useDevicePush', () => {
  it('dragging right or up advances, left or down withdraws', () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => (now += 100))
    const { el, onMove, root } = mount()
    act(() => el.dispatchEvent(pointer('pointerdown', 100, 100)))
    act(() => el.dispatchEvent(pointer('pointermove', 110, 100)))
    expect(onMove).toHaveBeenLastCalledWith(expect.closeTo(10 * DRAG_MM_PER_PX, 6))
    act(() => el.dispatchEvent(pointer('pointermove', 110, 90)))
    expect(onMove).toHaveBeenLastCalledWith(expect.closeTo(10 * DRAG_MM_PER_PX, 6))
    act(() => el.dispatchEvent(pointer('pointermove', 100, 100)))
    expect(onMove.mock.lastCall![0]).toBeLessThan(0)
    act(() => el.dispatchEvent(pointer('pointerup', 100, 100)))
    act(() => root.unmount())
  })

  it('keys only act while the monitor has focus', () => {
    const { el, onMove, onInflate, root } = mount()
    act(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(onMove).not.toHaveBeenCalled()
    el.focus()
    act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(onMove).toHaveBeenLastCalledWith(1)
    act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    expect(onMove).toHaveBeenLastCalledWith(-1)
    act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true })))
    expect(onInflate).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
  })
})
