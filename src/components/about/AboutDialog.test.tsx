// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AboutDialog } from './AboutDialog'

describe('AboutDialog', () => {
  it('credits everyone under Credits, with the base code named as such and no "built on"', () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(<AboutDialog open onClose={() => {}} />))
    const text = host.textContent ?? ''
    expect(text).toContain('Credits')
    expect(text).toMatch(/Base code.*iiviewer/)
    expect(text).toContain('neshallads')
    expect(text).not.toMatch(/built on/i)
    expect(text).not.toMatch(/permission/i)
    act(() => root.unmount())
  })
})
