/**
 * JSON in browser storage that never throws. Storage can be missing (private mode,
 * blocked cookies, tests), refuse reads or writes, or hold text from an older version.
 */
function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadJSON<T>(key: string, fallback: T, storage: Storage | null = defaultStorage()): T {
  if (!storage) return fallback
  try {
    const raw = storage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** True when the value was stored. */
export function saveJSON(key: string, value: unknown, storage: Storage | null = defaultStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
