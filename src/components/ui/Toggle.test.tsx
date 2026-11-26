// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('when locked, still shows its state but cannot be pressed, and says why', () => {
    const onChange = vi.fn()
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => root.render(<Toggle label="Labels" pressed onChange={onChange} lock="Learn always names the segments" />))
    const button = host.querySelector('button')!
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.disabled).toBe(true)
    expect(button.title).toBe('Learn always names the segments')
    act(() => button.click())
    expect(onChange).not.toHaveBeenCalled()
    act(() => root.unmount())
  })
})
