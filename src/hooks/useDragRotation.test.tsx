// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useDragRotation } from './useDragRotation'

function mount(enabled: boolean) {
  const adjustRaoLao = vi.fn()
  const adjustCranialCaudal = vi.fn()
  function Harness() {
    const { containerRef } = useDragRotation({ adjustRaoLao, adjustCranialCaudal, enabled })
    return <div ref={containerRef} id="monitor" />
  }
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(<Harness />))
  const el = host.querySelector('#monitor') as HTMLDivElement
  el.setPointerCapture = () => {}
  el.releasePointerCapture = () => {}
  const drag = () => {
    act(() => el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true })))
    act(() => el.dispatchEvent(new MouseEvent('pointermove', { clientX: 120, clientY: 90, bubbles: true })))
    act(() => el.dispatchEvent(new MouseEvent('pointerup', { clientX: 120, clientY: 90, bubbles: true })))
  }
  return { adjustRaoLao, adjustCranialCaudal, drag, root }
}

describe('useDragRotation', () => {
  it('turns the C-arm when the monitor is dragged', () => {
    const view = mount(true)
    view.drag()
    expect(view.adjustRaoLao).toHaveBeenCalled()
    act(() => view.root.unmount())
  })

  it('leaves the C-arm alone while switched off, as in the Cath lab where dragging moves the device', () => {
    const view = mount(false)
    view.drag()
    expect(view.adjustRaoLao).not.toHaveBeenCalled()
    expect(view.adjustCranialCaudal).not.toHaveBeenCalled()
    act(() => view.root.unmount())
  })
})
