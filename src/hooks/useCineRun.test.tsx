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
const settle = () => new Promise(resolve => setTimeout(resolve, 20))

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
})
