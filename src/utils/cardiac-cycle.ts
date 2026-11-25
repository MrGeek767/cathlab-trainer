/**
 * A simple cardiac cycle for the monitor: how far the heart has contracted at any
 * moment, how coronary flow carries contrast through the beat, the 15 frame-per-second
 * cine clock and an ECG trace to match. Everything runs off one clock (milliseconds,
 * performance.now()), so motion, contrast and the ECG stay in step.
 *
 * Illustrative, not a physiological model: systole takes about a third of the beat at
 * 70 bpm, the heart relaxes quickly in early diastole and rests until the next beat.
 */

/** The training patient's heart rate. */
export const HEART_RATE = 70

/** Systole, from the R wave to end-systole, as a fraction of the beat. */
export const SYSTOLE_FRACTION = 0.35

/** Rapid relaxation after end-systole, as a fraction of the beat. */
export const RELAXATION_FRACTION = 0.2

/**
 * How much systole slows coronary flow (0 none, 1 stops it). Left coronary flow is
 * mostly diastolic because the contracting left ventricle squeezes its intramural
 * vessels; the right coronary keeps more flow through systole.
 */
export const CORONARY_SYSTOLIC_DAMPING = { left: 0.7, right: 0.35 } as const

/** Cine and pulsed fluoro run at 15 frames a second. */
export const CINE_FRAME_MS = 1000 / 15

export function beatPeriodMs(heartRate: number): number {
  return 60000 / heartRate
}

/** Where in the beat `timeMs` falls: 0 at the R wave, rising to 1 at the next one. */
export function cardiacPhase(timeMs: number, heartRate: number): number {
  const period = beatPeriodMs(heartRate)
  const phase = (timeMs % period) / period
  return phase < 0 ? phase + 1 : phase
}

/** How far the heart has contracted: 0 relaxed (end-diastole), 1 at end-systole. */
export function contractionAt(timeMs: number, heartRate: number): number {
  return contractionAtPhase(cardiacPhase(timeMs, heartRate))
}

function contractionAtPhase(phase: number): number {
  if (phase < SYSTOLE_FRACTION) return Math.sin((Math.PI / 2) * (phase / SYSTOLE_FRACTION)) ** 2
  const relaxing = phase - SYSTOLE_FRACTION
  if (relaxing < RELAXATION_FRACTION) return Math.cos((Math.PI / 2) * (relaxing / RELAXATION_FRACTION)) ** 2
  return 0
}

/** Integral of the contraction from the R wave to `phase` (in phase units). */
function contractionIntegral(phase: number): number {
  const s = SYSTOLE_FRACTION
  const r = RELAXATION_FRACTION
  if (phase < s) return phase / 2 - (s / (2 * Math.PI)) * Math.sin((Math.PI * phase) / s)
  const y = Math.min(phase - s, r)
  return s / 2 + y / 2 + (r / (2 * Math.PI)) * Math.sin((Math.PI * y) / r)
}

/**
 * Time measured by coronary flow instead of the clock: it runs slower in systole (by
 * `systolicDamping`) and faster in diastole, and a whole beat of flow time is still one
 * beat. Contrast filling and washout follow it, so the column of contrast surges forward
 * with each diastole as it does on a real cine.
 */
export function flowTimeMs(timeMs: number, heartRate: number, systolicDamping: number): number {
  const period = beatPeriodMs(heartRate)
  const meanFlow = 1 - systolicDamping * (SYSTOLE_FRACTION / 2 + RELAXATION_FRACTION / 2)
  const beats = Math.floor(timeMs / period)
  const phase = timeMs / period - beats
  const withinBeat = phase - systolicDamping * contractionIntegral(phase)
  return (period * (beats * meanFlow + withinBeat)) / meanFlow
}

/** The start of the cine frame showing `timeMs` (frames are 1/15 s apart). */
export function cineFrameTime(timeMs: number): number {
  return Math.floor(timeMs / CINE_FRAME_MS + 1e-6) * CINE_FRAME_MS
}

/** Distance from `centre` to `phase` around the beat, between -0.5 and 0.5. */
function around(phase: number, centre: number): number {
  const d = (((phase - centre) % 1) + 1.5) % 1
  return d - 0.5
}

const ECG_WAVES = [
  { centre: 0.88, height: 0.12, width: 0.025 }, // P
  { centre: -0.012, height: -0.08, width: 0.006 }, // Q
  { centre: 0, height: 1, width: 0.008 }, // R
  { centre: 0.014, height: -0.2, width: 0.007 }, // S
  { centre: SYSTOLE_FRACTION - 0.07, height: 0.28, width: 0.045 }, // T, ending as systole does
] as const

/** A synthetic lead II trace (R wave = 1) at a point in the beat. */
export function ecgAt(phase: number): number {
  let value = 0
  for (const { centre, height, width } of ECG_WAVES) {
    const d = around(phase, centre)
    value += height * Math.exp(-(d * d) / (2 * width * width))
  }
  return value
}

/**
 * How long on the clock, from `startMs`, until `flowMs` of flow time has passed: the
 * inverse of flowTimeMs, found by bisection (flow time only ever moves forward).
 */
export function clockTimeForFlowMs(startMs: number, flowMs: number, heartRate: number, systolicDamping: number): number {
  const target = flowTimeMs(startMs, heartRate, systolicDamping) + flowMs
  let low = 0
  // Flow never runs slower than (1 - damping) of the mean, so this bound always holds.
  let high = flowMs / Math.max(1 - systolicDamping, 0.05) + beatPeriodMs(heartRate)
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2
    if (flowTimeMs(startMs + mid, heartRate, systolicDamping) < target) low = mid
    else high = mid
  }
  return (low + high) / 2
}
