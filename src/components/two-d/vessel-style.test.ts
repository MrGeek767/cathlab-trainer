import { describe, it, expect } from 'vitest'
import { vesselStyle } from './vessel-style'

const RED = '#e11d48'
const BLUE = '#2563eb'

describe('vesselStyle', () => {
  it('a challenge target and the dimmed vessels look the same whatever their colour', () => {
    for (const mode of ['fluoroscopy', 'schematic'] as const) {
      for (const tone of ['target', 'dim'] as const) {
        expect(vesselStyle(mode, tone, RED), `${mode} ${tone}`).toEqual(vesselStyle(mode, tone, BLUE))
      }
    }
  })

  it('outside a challenge, schematic vessels keep their own colours', () => {
    expect(vesselStyle('schematic', 'normal', RED)).not.toEqual(vesselStyle('schematic', 'normal', BLUE))
    expect(vesselStyle('schematic', 'hover', RED)).not.toEqual(vesselStyle('schematic', 'hover', BLUE))
  })

  it('the target stands out from the dimmed vessels', () => {
    for (const mode of ['fluoroscopy', 'schematic'] as const) {
      expect(vesselStyle(mode, 'target', RED), mode).not.toEqual(vesselStyle(mode, 'dim', RED))
    }
  })

  it('in fluoro the target is unmistakable: at least five times as dense as the dimmed vessels', () => {
    const target = vesselStyle('fluoroscopy', 'target', RED).density
    const dim = vesselStyle('fluoroscopy', 'dim', RED).density
    expect(target / dim).toBeGreaterThanOrEqual(5)
  })
})
