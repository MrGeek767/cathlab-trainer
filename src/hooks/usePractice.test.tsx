// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { deviceById } from '@/data/devices'
import { usePractice } from './usePractice'

describe('usePractice', () => {
  it('keeps its session across re-renders, as when the learner leaves the tab and comes back', () => {
    let api: ReturnType<typeof usePractice> | null = null
    function Harness({ tick }: { tick: number }) {
      api = usePractice()
      return <span>{tick}</span>
    }
    const root = createRoot(document.createElement('div'))
    act(() => root.render(<Harness tick={1} />))
    act(() => api!.dispatch({ type: 'pick', device: deviceById('sc-2.50x15')! }))
    act(() => root.render(<Harness tick={2} />))
    expect(api!.state.inHand?.id).toBe('sc-2.50x15')
    expect(api!.devices.inHand?.id).toBe('sc-2.50x15')
    expect(api!.lumens.get('prox-lad')).toBeTypeOf('function')
    act(() => root.unmount())
  })

  it('narrows the drawn proximal LAD at the lesion', () => {
    let api: ReturnType<typeof usePractice> | null = null
    function Harness() {
      api = usePractice()
      return null
    }
    const root = createRoot(document.createElement('div'))
    act(() => root.render(<Harness />))
    const radius = api!.lumens.get('prox-lad')!
    expect(radius(14) / radius(2)).toBeLessThan(0.3)
    act(() => root.unmount())
  })
})
