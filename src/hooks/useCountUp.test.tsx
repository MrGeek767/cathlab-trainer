// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useCountUp } from './useCountUp'

let now = 0
let frames: FrameRequestCallback[] = []
const runFrame = () => {
  const due = frames
  frames = []
  act(() => due.forEach(f => f(now)))
}

beforeEach(() => {
  now = 0
  frames = []
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.spyOn(performance, 'now').mockImplementation(() => now)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mount(target: number) {
  const seen: number[] = []
  function Harness() {
    seen.push(useCountUp(target, 1000))
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(<Harness />))
  return { seen, root }
}

describe('useCountUp: a score that counts up when the results appear', () => {
  it('starts at zero, rises, and lands exactly on the target', () => {
    const { seen, root } = mount(80)
    expect(seen.at(-1)).toBe(0)
    now = 300
    runFrame()
    const middle = seen.at(-1)!
    expect(middle).toBeGreaterThan(0)
    expect(middle).toBeLessThan(80)
    now = 1000
    runFrame()
    expect(seen.at(-1)).toBe(80)
    act(() => root.unmount())
  })

  it('shows the target at once when the computer asks for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const { seen, root } = mount(80)
    expect(seen.at(-1)).toBe(80)
    act(() => root.unmount())
  })
})
