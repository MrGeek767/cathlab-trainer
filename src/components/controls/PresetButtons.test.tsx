// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { PresetButtons } from './PresetButtons'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

async function renderButtons(showHints?: boolean): Promise<{ titles: string[]; unmount: () => void }> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <PresetButtons currentAngles={{ raoLao: 0, cranialCaudal: 0 }} onSelectPreset={() => {}} showHints={showHints} />,
    )
  })
  const titles = [...host.querySelectorAll('button')].map(button => button.title)
  return { titles, unmount: () => act(() => root.unmount()) }
}

describe('PresetButtons', () => {
  it('describes what each view shows outside the challenges', async () => {
    const { titles, unmount } = await renderButtons()
    expect(titles).toHaveLength(10)
    expect(titles.every(title => title.length > 0)).toBe(true)
    unmount()
  })

  it('gives no descriptions away during the challenges', async () => {
    const { titles, unmount } = await renderButtons(false)
    expect(titles).toHaveLength(10)
    expect(titles.filter(title => title.length > 0)).toEqual([])
    unmount()
  })
})
