// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Segmented } from './Segmented'
import { ModeTabs } from '../layout/ModeTabs'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

async function mount(node: React.ReactNode) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => root.render(node))
  return { host, unmount: () => act(() => root.unmount()) }
}

const press = (element: Element, key: string) =>
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })

describe('Segmented', () => {
  const options = [
    { value: 'right', label: 'Right' },
    { value: 'left', label: 'Left' },
    { value: 'codominant', label: 'Co-dominant' },
  ]

  it('is a labelled radio group with the current choice checked', async () => {
    const { host, unmount } = await mount(
      <Segmented label="Dominance" options={options} value="left" onChange={() => {}} />,
    )
    const group = host.querySelector('[role="radiogroup"]')
    expect(group?.getAttribute('aria-label')).toBe('Dominance')
    const radios = [...host.querySelectorAll('[role="radio"]')]
    expect(radios.map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    unmount()
  })

  it('reports a click and moves with the arrow keys, wrapping at the ends', async () => {
    const onChange = vi.fn()
    const { host, unmount } = await mount(
      <Segmented label="Dominance" options={options} value="codominant" onChange={onChange} />,
    )
    const radios = [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    act(() => radios[0]!.click())
    expect(onChange).toHaveBeenLastCalledWith('right')
    press(radios[2]!, 'ArrowRight')
    expect(onChange).toHaveBeenLastCalledWith('right')
    press(radios[2]!, 'ArrowLeft')
    expect(onChange).toHaveBeenLastCalledWith('left')
    unmount()
  })
})

describe('ModeTabs', () => {
  it('is a tab list with the active tab selected, and arrows switch tabs', async () => {
    const onChange = vi.fn()
    const { host, unmount } = await mount(<ModeTabs value="explore" onChange={onChange} />)
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs.map(t => t.textContent)).toEqual(['Explore', 'Learn', 'Quiz', 'Challenges'])
    expect(tabs.map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false'])
    act(() => tabs[3]!.click())
    expect(onChange).toHaveBeenLastCalledWith('challenges')
    press(tabs[0]!, 'ArrowRight')
    expect(onChange).toHaveBeenLastCalledWith('guided')
    unmount()
  })
})
