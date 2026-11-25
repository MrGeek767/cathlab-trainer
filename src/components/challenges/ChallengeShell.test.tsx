// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ChallengeShell } from './ChallengeShell'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'

const segments = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')

describe('ChallengeShell', () => {
  it('tells the app when an exam is running, so the monitor can switch to real fluoro', () => {
    const onExamChange = vi.fn()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() =>
      root.render(
        <ChallengeShell
          segments={segments}
          angles={{ raoLao: 0, cranialCaudal: 0 }}
          animateTo={() => {}}
          onHighlightChange={() => {}}
          onExamChange={onExamChange}
        />,
      ),
    )
    expect(onExamChange).toHaveBeenLastCalledWith(false)
    const exam = [...host.querySelectorAll('[role="radio"]')].find(el => el.textContent === 'Exam') as HTMLElement
    act(() => exam.click())
    expect(onExamChange).toHaveBeenLastCalledWith(true)
    act(() => root.unmount())
    expect(onExamChange).toHaveBeenLastCalledWith(false)
  })
})
