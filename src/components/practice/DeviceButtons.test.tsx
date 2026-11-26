// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { DeviceButtons } from './DeviceButtons'

afterEach(() => vi.useRealTimers())

function render(disabled = false) {
  const onMove = vi.fn()
  const onInflate = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(<DeviceButtons disabled={disabled} onMove={onMove} onInflate={onInflate} />))
  const button = (name: string) => [...host.querySelectorAll('button')].find(b => b.textContent === name) as HTMLButtonElement
  return { host, root, onMove, onInflate, button }
}

const down = (el: Element) => act(() => el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })))
const up = (el: Element) => act(() => el.dispatchEvent(new MouseEvent('pointerup', { bubbles: true })))

describe('DeviceButtons', () => {
  it('offers push, pull and inflate as buttons with names', () => {
    const view = render()
    expect(view.button('Pull back')).toBeTruthy()
    expect(view.button('Push')).toBeTruthy()
    down(view.button('Push'))
    up(view.button('Push'))
    expect(view.onMove).toHaveBeenLastCalledWith(1)
    down(view.button('Pull back'))
    up(view.button('Pull back'))
    expect(view.onMove).toHaveBeenLastCalledWith(-1)
    act(() => view.button('Inflate').click())
    expect(view.onInflate).toHaveBeenCalledTimes(1)
    act(() => view.root.unmount())
  })

  it('keeps stepping while Push is held, and stops on release', () => {
    vi.useFakeTimers()
    const view = render()
    down(view.button('Push'))
    act(() => vi.advanceTimersByTime(1000))
    const held = view.onMove.mock.calls.length
    expect(held).toBeGreaterThan(5)
    up(view.button('Push'))
    act(() => vi.advanceTimersByTime(1000))
    expect(view.onMove.mock.calls.length).toBe(held)
    act(() => view.root.unmount())
  })

  it('steps once per Enter or Space for keyboard users', () => {
    const view = render()
    act(() => view.button('Push').click())
    expect(view.onMove).toHaveBeenCalledTimes(1)
    act(() => view.root.unmount())
  })

  it('does nothing while disabled', () => {
    const view = render(true)
    expect(view.button('Push').disabled).toBe(true)
    expect(view.button('Inflate').disabled).toBe(true)
    act(() => view.root.unmount())
  })
})
