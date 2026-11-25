import { describe, it, expect } from 'vitest'
import { loadJSON, saveJSON } from './safe-storage'

function memoryStorage(overrides: Partial<Storage> = {}): Storage {
  const data = new Map<string, string>()
  const storage: Storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, String(value))
    },
    removeItem: key => {
      data.delete(key)
    },
    clear: () => data.clear(),
    key: index => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
  }
  return Object.assign(storage, overrides)
}

describe('safe storage', () => {
  it('round-trips JSON', () => {
    const storage = memoryStorage()
    expect(saveJSON('k', { a: 1 }, storage)).toBe(true)
    expect(loadJSON('k', null, storage)).toEqual({ a: 1 })
  })

  it('returns the fallback when reading throws', () => {
    const storage = memoryStorage({
      getItem: () => {
        throw new Error('denied')
      },
    })
    expect(loadJSON('k', 7, storage)).toBe(7)
  })

  it('returns false when writing throws (quota)', () => {
    const storage = memoryStorage({
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    expect(saveJSON('k', 1, storage)).toBe(false)
  })

  it('returns the fallback on invalid JSON', () => {
    const storage = memoryStorage({ getItem: () => '{oops' })
    expect(loadJSON('k', 'fallback', storage)).toBe('fallback')
  })

  it('copes with no storage at all', () => {
    expect(loadJSON('k', 3, null)).toBe(3)
    expect(saveJSON('k', 1, null)).toBe(false)
  })
})
