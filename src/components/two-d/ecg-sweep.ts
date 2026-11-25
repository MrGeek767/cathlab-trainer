import { cardiacPhase, ecgAt } from '@/utils/cardiac-cycle'

/** Share of the trace erased just ahead of the sweep head, as on a bedside monitor. */
export const ECG_GAP_FRACTION = 0.04

const PEAK_SUBSAMPLES = 6

/**
 * The trace a sweeping monitor shows at `nowMs`: one value per column (null in the
 * erased gap). The head writes left to right across `windowMs` of time and wraps
 * around; each column keeps the value written when the head last passed it.
 */
export function sweepSamples(
  nowMs: number,
  windowMs: number,
  columns: number,
  heartRate: number,
  gapFraction = ECG_GAP_FRACTION,
): (number | null)[] {
  const head = Math.floor(((nowMs % windowMs) / windowMs) * columns)
  const gap = Math.max(1, Math.round(gapFraction * columns))
  const samples: (number | null)[] = new Array(columns)
  for (let x = 0; x < columns; x++) {
    const ahead = (x - head + columns) % columns
    if (ahead > 0 && ahead <= gap) {
      samples[x] = null
      continue
    }
    // Peak detect across the column's slice of time, so a narrow R wave never slips
    // between two columns and every beat stands as tall as the last.
    const t = nowMs - ((head - x + columns) % columns) * (windowMs / columns)
    let value = 0
    for (let k = 0; k < PEAK_SUBSAMPLES; k++) {
      const v = ecgAt(cardiacPhase(t - (k / PEAK_SUBSAMPLES) * (windowMs / columns), heartRate))
      if (Math.abs(v) > Math.abs(value)) value = v
    }
    samples[x] = value
  }
  return samples
}
