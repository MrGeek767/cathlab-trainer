// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ModeTabs, MODE_TABS } from './ModeTabs'

describe('ModeTabs on a narrow screen', () => {
  it('collapses to icons below tablet width but keeps every tab named for screen readers', () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(<ModeTabs value="explore" onChange={() => {}} />))
    const tabs = [...host.querySelectorAll('[role="tab"]')]
    expect(tabs).toHaveLength(MODE_TABS.length)
    tabs.forEach((tab, i) => {
      const label = [...tab.querySelectorAll('span')].find(span => span.textContent === MODE_TABS[i]!.label)!
      expect(label, MODE_TABS[i]!.label).toBeTruthy()
      // Visually hidden on phones (still read out), shown from md up.
      expect(label.classList.contains('sr-only')).toBe(true)
      expect(label.classList.contains('md:not-sr-only')).toBe(true)
    })
    act(() => root.unmount())
  })
})
