// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ResultsBody, type AnswerRecord } from './ResultsBody'

const answers: AnswerRecord[] = [
  { kind: 'show-me', itemId: 'om1', correct: false, prompt: 'Show the first obtuse marginal.', yourAnswer: 'AP Straight', rightAnswer: 'RAO 30 Caudal 25' },
  { kind: 'show-me', itemId: 'lm', correct: true, prompt: 'Show the left main.', yourAnswer: 'Spider', rightAnswer: 'Spider' },
]

function render(print: boolean) {
  const host = document.createElement('div')
  const root = createRoot(host)
  act(() =>
    root.render(<ResultsBody mode="learner" kind="show-me" answers={answers} best={{ 'show-me': 0, 'name-segment': 0 }} print={print} />),
  )
  const classes = [...host.querySelectorAll('[class]')].flatMap(el => [...el.classList])
  const text = host.textContent ?? ''
  act(() => root.unmount())
  return { classes, text }
}

describe('ResultsBody', () => {
  it('prints with no animations and dark text, so the page is never blank or faint', () => {
    const { classes, text } = render(true)
    expect(classes.filter(c => c.startsWith('animate-'))).toEqual([])
    expect(classes.filter(c => c === 'text-white' || c.startsWith('text-ink'))).toEqual([])
    expect(text).toContain('Show the first obtuse marginal.')
    expect(text).toContain('50%')
  })

  it('on screen the score bar fills and the answers slide in', () => {
    const { classes } = render(false)
    expect(classes).toContain('animate-grow')
    expect(classes).toContain('animate-panel-in')
  })
})
