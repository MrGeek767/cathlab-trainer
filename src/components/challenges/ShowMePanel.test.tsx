// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ShowMePanel } from './ShowMePanel'
import { SHOW_ME_ITEMS } from '@/challenges/show-me'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'

const segments = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')

function render(realFluoro: boolean) {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() =>
    root.render(
      <ShowMePanel
        item={SHOW_ME_ITEMS[0]!}
        segments={segments}
        raoLao={0}
        cranialCaudal={0}
        revealFeedback
        realFluoro={realFluoro}
        onSubmit={() => {}}
        onGoToBest={() => {}}
      />,
    ),
  )
  const text = host.textContent ?? ''
  act(() => root.unmount())
  return text
}

describe('ShowMePanel', () => {
  it('in real fluoro, tells the learner to inject to see the arteries', () => {
    expect(render(true)).toMatch(/Inject contrast/)
    expect(render(false)).not.toMatch(/Inject contrast/)
  })
})
