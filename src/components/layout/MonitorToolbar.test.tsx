// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MonitorToolbar } from './MonitorToolbar'

const NOOP = () => {}
const base = {
  viewMode: 'fluoroscopy' as const,
  onViewMode: NOOP,
  realFluoro: false,
  onRealFluoro: NOOP,
  labels: false,
  onLabels: NOOP,
  labelsLock: null,
  inverted: false,
  onInverted: NOOP,
  heartbeat: true,
  onHeartbeat: NOOP,
}

function group(host: HTMLElement, label: string) {
  return host.querySelector(`[role="radiogroup"][aria-label="${label}"]`)!
}

describe('MonitorToolbar', () => {
  it('in the practice, fixes only the image, and says why beside it', () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(<MonitorToolbar {...base} imageLock="The practice uses the fluoro image" realFluoroLocked={false} />))
    expect(group(host, 'Image').getAttribute('aria-disabled')).toBe('true')
    expect(group(host, 'Vessels').getAttribute('aria-disabled')).toBeNull()
    const reason = [...host.querySelectorAll('span')].find(span => span.textContent === 'The practice uses the fluoro image')!
    expect(reason).toBeTruthy()
    expect(group(host, 'Image').nextElementSibling?.contains(reason)).toBe(true)
    act(() => root.unmount())
  })

  it('in an exam, fixes the image and the vessels, as before', () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(<MonitorToolbar {...base} realFluoro imageLock="Exams use real fluoro" realFluoroLocked />))
    expect(group(host, 'Image').getAttribute('aria-disabled')).toBe('true')
    expect(group(host, 'Vessels').getAttribute('aria-disabled')).toBe('true')
    expect(host.textContent).toContain('Exams use real fluoro')
    act(() => root.unmount())
  })
})
