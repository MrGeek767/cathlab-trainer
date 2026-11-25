/** Fisher–Yates shuffle into a new array, driven by `rng` (values in [0, 1)). */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const held = out[i] as T
    out[i] = out[j] as T
    out[j] = held
  }
  return out
}
