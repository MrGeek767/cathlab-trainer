// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { GradeBadge } from './GradeBadge'
import type { Grade } from '@/practice/grades'

function render(grade: Grade) {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() => root.render(<GradeBadge grade={grade} />))
  const badge = host.firstElementChild as HTMLElement
  const result = { text: badge.textContent ?? '', classes: [...badge.classList] }
  act(() => root.unmount())
  return result
}

describe('GradeBadge', () => {
  it('shows red and a cross only for Unsafe', () => {
    const unsafe = render('unsafe')
    expect(unsafe.classes).toContain('text-alarm')
    expect(unsafe.text).toContain('✗')
    expect(unsafe.text).toContain('Unsafe')

    const best = render('best')
    expect(best.classes).toContain('text-ecg')
    expect(best.text).toContain('✓')

    const notSuitable = render('not-suitable')
    expect(notSuitable.classes).not.toContain('text-alarm')
    expect(notSuitable.classes).not.toContain('text-ecg')
    expect(notSuitable.text).toContain('–')
    expect(notSuitable.text).toContain('Not suitable')

    const acceptable = render('acceptable')
    expect(acceptable.classes).not.toContain('text-alarm')
    expect(acceptable.text).toContain('✓')
  })
})
