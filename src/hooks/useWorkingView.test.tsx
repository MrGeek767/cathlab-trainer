// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { PRACTICE_WORKING_VIEW } from '@/practice/app-rules'
import { useWorkingView } from './useWorkingView'

describe('useWorkingView', () => {
  it('moves the C-arm to the working view the first time the Cath lab opens, and leaves it to the learner after', () => {
    const animateTo = vi.fn()
    function Harness({ active }: { active: boolean }) {
      useWorkingView(active, animateTo)
      return null
    }
    const root = createRoot(document.createElement('div'))
    act(() => root.render(<Harness active={false} />))
    expect(animateTo).not.toHaveBeenCalled()
    act(() => root.render(<Harness active />))
    expect(animateTo).toHaveBeenCalledTimes(1)
    expect(animateTo).toHaveBeenCalledWith(PRACTICE_WORKING_VIEW)
    act(() => root.render(<Harness active={false} />))
    act(() => root.render(<Harness active />))
    expect(animateTo).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
  })
})
