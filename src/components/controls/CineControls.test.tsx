// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { CineControls } from './CineControls'

describe('CineControls', () => {
  it('locks the injection side, and says why, while a question chooses it', () => {
    const onSideChange = vi.fn()
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() =>
      root.render(
        <CineControls
          side="left"
          onSideChange={onSideChange}
          sideLock="This question injects its own coronary"
          playing={false}
          onPlay={() => {}}
          onStop={() => {}}
        />,
      ),
    )
    const right = [...host.querySelectorAll('[role="radio"]')].find(el => el.textContent === 'Right coronary') as HTMLButtonElement
    expect(right.disabled).toBe(true)
    act(() => right.click())
    expect(onSideChange).not.toHaveBeenCalled()
    expect(host.textContent).toContain('This question injects its own coronary')
    act(() => root.unmount())
  })
})
