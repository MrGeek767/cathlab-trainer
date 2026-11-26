// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { DominanceToggle } from './DominanceToggle'

describe('DominanceToggle', () => {
  it('is fixed with its reason while the practice patient is on the table', () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(<DominanceToggle value="right" onChange={() => {}} lock="The practice patient is right dominant" />))
    const radios = [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    expect(radios.length).toBeGreaterThan(0)
    expect(radios.every(radio => radio.disabled)).toBe(true)
    expect(host.textContent).toContain('The practice patient is right dominant')
    act(() => root.render(<DominanceToggle value="left" onChange={() => {}} />))
    expect([...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')].some(radio => radio.disabled)).toBe(false)
    act(() => root.unmount())
  })
})
