// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useCineRun } from './useCineRun'
import { buildVesselTree, type InjectionSide } from '@/utils/contrast'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'

const tree = buildVesselTree(applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right'))

// Hand-driven clock and animation frames, so a frame can land at an exact moment.
let now = 0
let frames: { id: number; callback: FrameRequestCallback }[] = []
let nextFrameId = 1
function runFrame() {
  const due = frames
  frames = []
  due.forEach(f => f.callback(now))
}
// Let React finish rendering. Its scheduler works in setImmediate slices, and on a busy
// machine a short timer alone can fire before them, so drain those slices first.
const { setImmediate: nextSlice } = globalThis as unknown as { setImmediate: (callback: () => void) => void }
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise<void>(resolve => nextSlice(resolve))
  await new Promise(resolve => setTimeout(resolve, 20))
}

beforeEach(() => {
  now = 0
  frames = []
  nextFrameId = 1
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrameId++
    frames.push({ id, callback })
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames = frames.filter(f => f.id !== id)
  })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useCineRun', () => {
  it('a side change mid-run never leaves a stale frame behind', async () => {
    let cine: ReturnType<typeof useCineRun> | null = null
    function Harness() {
      const [side, setSide] = useState<InjectionSide>('left')
      cine = useCineRun(tree, side)
      return (
        <div>
          <button id="play" onClick={cine.play} />
          <button id="right" onClick={() => setSide('right')} />
        </div>
      )
    }
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const click = (id: string) =>
      host.querySelector(`#${id}`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    root.render(<Harness />)
    await settle()
    click('play')
    await settle()
    now = 1500
    runFrame()
    await settle()
    expect(cine!.playing).toBe(true)

    click('right') // switch the injection side mid-run
    await Promise.resolve()
    now = 1516
    runFrame() // a display frame lands before React's follow-up render
    await settle()
    now = 5000
    runFrame()
    await settle()

    expect(cine!.playing).toBe(false)
    expect(cine!.opacity).toBeNull()
    root.unmount()
  })

  function mount() {
    let cine: ReturnType<typeof useCineRun> | null = null
    function Harness() {
      cine = useCineRun(tree, 'left')
      return <button id="play" onClick={cine.play} />
    }
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    root.render(<Harness />)
    const play = () => host.querySelector('#play')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return { get: () => cine!, play, root }
  }
  async function at(ms: number) {
    now = ms
    runFrame()
    await settle()
  }

  it('steps the image at 15 frames a second, as cine does', async () => {
    const { get, play, root } = mount()
    await settle()
    play()
    await settle()
    await at(10)
    expect(get().frame?.index).toBe(1)
    const first = get().opacity
    await at(40) // same 1/15 s frame: nothing new to show
    expect(get().opacity).toBe(first)
    expect(get().frame?.index).toBe(1)
    await at(70)
    expect(get().frame?.index).toBe(2)
    await at(140)
    expect(get().frame?.index).toBe(3)
    root.unmount()
  })

  it('shows no contrast before the first frame is drawn, never the road map', async () => {
    const { get, play, root } = mount()
    await settle()
    play()
    await settle()
    expect(get().playing).toBe(true)
    expect(get().opacity).not.toBeNull()
    root.unmount()
  })

  it('lasts six and a half beats of coronary flow, then stops by itself', async () => {
    const { get, play, root } = mount()
    await settle()
    play()
    await settle()
    await at(5500)
    expect(get().playing).toBe(true)
    const frame = get().frame!
    expect(frame.total).toBeGreaterThanOrEqual(84)
    expect(frame.total).toBeLessThanOrEqual(86)
    expect(frame.index).toBeLessThanOrEqual(frame.total)
    await at(5800)
    expect(get().playing).toBe(false)
    expect(get().opacity).toBeNull()
    expect(get().frame).toBeNull()
    root.unmount()
  })
})

