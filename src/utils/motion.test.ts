import { describe, it, expect, vi, afterEach } from 'vitest'
import { scrollBehavior } from './motion'

afterEach(() => vi.unstubAllGlobals())

describe('scrollBehavior', () => {
  it('jumps instead of gliding when the computer asks for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(scrollBehavior()).toBe('auto')
  })

  it('glides otherwise', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(scrollBehavior()).toBe('smooth')
  })
})
