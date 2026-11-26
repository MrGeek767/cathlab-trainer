// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AppFooter } from './AppFooter'

describe('AppFooter', () => {
  it("carries the disclaimer and the creator's credit; everyone else is credited in About", () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(<AppFooter />))
    const text = host.textContent ?? ''
    expect(text).toContain('Educational simulation, not for clinical use.')
    expect(text).toContain('Omar M. Noreldin')
    expect(text).not.toContain('neshallads')
    act(() => root.unmount())
  })
})
