// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { deviceById } from '@/data/devices'
import type { InflationState } from '@/practice/session'
import { InflationDevice } from './InflationDevice'

const stent = deviceById('des-3.00x18')!
const call = { text: 'Deploy to 3.10 mm.', targetAtm: 13 }

afterEach(() => vi.useRealTimers())

function render(inflation: Partial<InflationState> = {}) {
  const onAction = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const state: InflationState = { atm: 13, peakAtm: 13, overRbpAllowed: false, needsConfirm: false, ...inflation }
  act(() => root.render(<InflationDevice device={stent} inflation={state} call={call} onAction={onAction} />))
  const device = host.querySelector('[aria-label="Inflation device"]') as HTMLElement
  const button = (name: string) => [...host.querySelectorAll('button')].find(b => b.textContent === name) as HTMLButtonElement | undefined
  return { host, root, onAction, device, button }
}

describe('InflationDevice', () => {
  it('shows the call, the pressure and the diameter the chart gives', () => {
    const view = render()
    expect(view.host.textContent).toContain('Deploy to 3.10 mm.')
    expect(view.host.textContent).toContain('13 atm')
    expect(view.host.textContent).toContain('3.10 mm')
    // The chart's row for the current pressure is the one marked.
    const current = view.host.querySelector('[aria-current="true"]')
    expect(current?.textContent).toContain('13')
    act(() => view.root.unmount())
  })

  it('takes focus when it opens, so the keys work at once', () => {
    const view = render()
    expect(document.activeElement).toBe(view.device)
    act(() => view.root.unmount())
  })

  it('hands focus back to where it came from when it closes', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const view = render()
    expect(document.activeElement).toBe(view.device)
    act(() => view.root.unmount())
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('raises pressure with the keys and deflates', () => {
    const view = render()
    act(() => view.device.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    expect(view.onAction).toHaveBeenLastCalledWith({ type: 'set-pressure', atm: 14 })
    act(() => view.device.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    expect(view.onAction).toHaveBeenLastCalledWith({ type: 'set-pressure', atm: 12 })
    act(() => view.button('Deflate')!.click())
    expect(view.onAction).toHaveBeenLastCalledWith({ type: 'deflate' })
    act(() => view.root.unmount())
  })

  it('turns the pressure half an atmosphere per wheel notch', () => {
    const view = render()
    act(() => view.device.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })))
    expect(view.onAction).toHaveBeenLastCalledWith({ type: 'set-pressure', atm: 13.5 })
    act(() => view.root.unmount())
  })

  it('raises the pressure 2.5 atm a second while Inflate is held, and stops on release', () => {
    vi.useFakeTimers()
    const view = render()
    const inflate = view.button('Inflate')!
    act(() => inflate.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })))
    act(() => vi.advanceTimersByTime(1000))
    const last = view.onAction.mock.lastCall![0] as { type: string; atm: number }
    expect(last.type).toBe('set-pressure')
    expect(last.atm).toBeCloseTo(15.5, 1)
    act(() => inflate.dispatchEvent(new MouseEvent('pointerup', { bubbles: true })))
    const calls = view.onAction.mock.calls.length
    act(() => vi.advanceTimersByTime(1000))
    expect(view.onAction.mock.calls.length).toBe(calls)
    act(() => view.root.unmount())
  })

  it('asks before going past rated burst pressure', () => {
    const view = render({ atm: 16, peakAtm: 16, needsConfirm: true })
    expect(view.host.textContent).toContain('Above rated burst pressure. Go higher?')
    act(() => view.button('Go higher')!.click())
    expect(view.onAction).toHaveBeenLastCalledWith({ type: 'confirm-over-rbp' })
    act(() => view.root.unmount())
  })
})
