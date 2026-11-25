// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useInjectionLoop, LOOP_FIRST_DELAY_MS, LOOP_GAP_MS } from './useInjectionLoop'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function mount(initial: { active: boolean; playing: boolean }) {
  const play = vi.fn()
  let props = initial
  function Harness() {
    useInjectionLoop(props.active, props.playing, play)
    return null
  }
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(<Harness />))
  const update = (next: { active: boolean; playing: boolean }) => {
    props = next
    act(() => root.render(<Harness />))
  }
  return { play, update, root }
}

describe('useInjectionLoop: repeat injections while a real-fluoro question is on screen', () => {
  it('injects shortly after the question appears', () => {
    const { play, root } = mount({ active: true, playing: false })
    act(() => vi.advanceTimersByTime(LOOP_FIRST_DELAY_MS - 1))
    expect(play).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(play).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
  })

  it('injects again a moment after each run ends', () => {
    const { play, update, root } = mount({ active: true, playing: false })
    act(() => vi.advanceTimersByTime(LOOP_FIRST_DELAY_MS))
    update({ active: true, playing: true })
    update({ active: true, playing: false })
    act(() => vi.advanceTimersByTime(LOOP_GAP_MS - 1))
    expect(play).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(1))
    expect(play).toHaveBeenCalledTimes(2)
    act(() => root.unmount())
  })

  it('does nothing when not active, and stops when the question goes', () => {
    const { play, update, root } = mount({ active: false, playing: false })
    act(() => vi.advanceTimersByTime(10 * LOOP_GAP_MS))
    expect(play).not.toHaveBeenCalled()
    update({ active: true, playing: false })
    update({ active: false, playing: false })
    act(() => vi.advanceTimersByTime(10 * LOOP_GAP_MS))
    expect(play).not.toHaveBeenCalled()
    act(() => root.unmount())
  })
})
