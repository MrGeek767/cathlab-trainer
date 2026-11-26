// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { applyAnatomy } from '@/data/segment-sizes'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { buildVesselPaths } from '@/utils/vessel-paths'
import { MM_TO_SCENE } from '@/utils/geometry'
import { deviceById } from '@/data/devices'
import { PRACTICE_LESION } from '@/practice/lesion'
import { LAD_RAIL, buildRail } from '@/practice/rail'
import { initialPractice, type PracticeContext, type PracticeState } from '@/practice/session'
import { PracticePanel } from './PracticePanel'

const segments = applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')
const paths = buildVesselPaths(segments)
const rail = buildRail(LAD_RAIL, paths)
const ctx: PracticeContext = {
  rail,
  segment: segments.find(s => s.id === 'prox-lad')!,
  segmentLengthMm: paths.get('prox-lad')!.getLength() / MM_TO_SCENE,
  lesion: PRACTICE_LESION,
  guideTipMm: 2,
  wireTipMm: rail.lengthMm - 20,
  proximalRefMm: 3.2,
  distalRefMm: 3.1,
}

function render(state: PracticeState) {
  const onAction = vi.fn()
  const onFinalShot = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(<PracticePanel state={state} onAction={onAction} onFinalShot={onFinalShot} />))
  const click = (el: Element | null | undefined) => act(() => (el as HTMLElement).click())
  const radio = (label: string) => [...host.querySelectorAll('[role="radio"]')].find(el => el.textContent === label)
  const button = (name: string) =>
    [...host.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === name || b.textContent === name) as HTMLButtonElement | undefined
  return { host, root, onAction, onFinalShot, click, radio, button }
}

describe('PracticePanel', () => {
  it('picking a size in the shelf dispatches it', () => {
    const view = render(initialPractice(ctx))
    view.click(view.radio('Stents'))
    view.click(view.button('Drug-eluting stent 3.00 × 18 mm'))
    expect(view.onAction).toHaveBeenCalledWith({ type: 'pick', device: deviceById('des-3.00x18') })
    act(() => view.root.unmount())
  })

  it('disables stents once one is placed, and says why', () => {
    const state = { ...initialPractice(ctx), step: 'postdilate' as const }
    state.vessel = { ...state.vessel, stent: { startMm: 5, endMm: 23, nominalDiameterMm: 3 } }
    const view = render(state)
    view.click(view.radio('Stents'))
    expect(view.button('Drug-eluting stent 3.00 × 18 mm')!.disabled).toBe(true)
    expect(view.host.textContent).toContain('One stent covers this lesion')
    act(() => view.root.unmount())
  })

  it('shows the device in hand with its compliance chart, nominal and rated burst marked', () => {
    const state = { ...initialPractice(ctx), inHand: deviceById('sc-2.50x15')! }
    const view = render(state)
    const card = view.host.querySelector('[aria-label="In hand"]')!
    expect(card.textContent).toContain('Semi-compliant balloon 2.50 × 15 mm')
    const rows = [...card.querySelectorAll('tbody tr')].map(row => row.textContent)
    expect(rows).toContain('6NOM2.50')
    expect(rows).toContain('14RBP2.75')
    expect(rows).toHaveLength(13)
    act(() => view.root.unmount())
  })

  it('offers the final shot only when allowed', () => {
    const early = render(initialPractice(ctx))
    expect(early.button('Final shot')!.disabled).toBe(true)
    act(() => early.root.unmount())
    const ready = { ...initialPractice(ctx), step: 'final' as const }
    ready.vessel = { ...ready.vessel, stent: { startMm: 5, endMm: 23, nominalDiameterMm: 3 } }
    const late = render(ready)
    expect(late.button('Final shot')!.disabled).toBe(false)
    late.click(late.button('Final shot'))
    expect(late.onFinalShot).toHaveBeenCalled()
    act(() => late.root.unmount())
  })
})
