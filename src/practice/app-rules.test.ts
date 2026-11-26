import { describe, it, expect } from 'vitest'
import { applyAnatomy } from '@/data/segment-sizes'
import { orientAnatomy } from '@/data/orientation'
import { RIGHT_DOMINANT_SEGMENTS } from '@/data/arteries'
import { measureViewGeometry, sampleSegments } from '@/utils/view-quality'
import { sideOf } from '@/utils/contrast'
import { PRACTICE_WORKING_VIEW, effectiveDominance } from './app-rules'

describe('effectiveDominance', () => {
  it('the practice patient is always right dominant', () => {
    expect(effectiveDominance('cathlab', 'left')).toBe('right')
    expect(effectiveDominance('cathlab', 'codominant')).toBe('right')
    expect(effectiveDominance('explore', 'left')).toBe('left')
    expect(effectiveDominance('challenges', 'codominant')).toBe('codominant')
  })
})

describe('PRACTICE_WORKING_VIEW', () => {
  it('opens the proximal LAD, which the default AP view all but hides', () => {
    const anatomy = applyAnatomy(orientAnatomy(RIGHT_DOMINANT_SEGMENTS), 'right')
    const sampled = sampleSegments(anatomy.filter(s => sideOf(s) === 'left'))
    const foreshortening = (raoLao: number, cranialCaudal: number) =>
      measureViewGeometry(sampled, raoLao, cranialCaudal).get('prox-lad')!.foreshorten
    expect(foreshortening(0, 0)).toBeGreaterThan(0.8)
    expect(foreshortening(PRACTICE_WORKING_VIEW.raoLao, PRACTICE_WORKING_VIEW.cranialCaudal)).toBeLessThan(0.2)
  })
})
