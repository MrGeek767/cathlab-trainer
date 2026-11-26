/**
 * The practice shelf: generic balloons and drug-eluting stents, no brands. Compliance
 * values are illustrative, within the ranges of commonly published charts (design §7.4).
 */

export interface ComplianceChart {
  nominalAtm: number
  /** Rated burst pressure. */
  rbpAtm: number
  /** How much bigger than labelled the device is at RBP (0.10 = 10%). */
  growthAtRbp: number
}

export const CHARTS = {
  semiCompliant: { nominalAtm: 6, rbpAtm: 14, growthAtRbp: 0.1 },
  nonCompliant: { nominalAtm: 10, rbpAtm: 20, growthAtRbp: 0.04 },
  stent: { nominalAtm: 9, rbpAtm: 16, growthAtRbp: 0.06 },
} as const satisfies Record<string, ComplianceChart>

export type BalloonKind = 'semi-compliant' | 'non-compliant'

export interface Balloon {
  id: string
  category: 'balloon'
  kind: BalloonKind
  diameterMm: number
  lengthMm: number
  chart: ComplianceChart
}

export interface Stent {
  id: string
  category: 'stent'
  diameterMm: number
  lengthMm: number
  chart: ComplianceChart
}

export type Device = Balloon | Stent

/** Sizes from `from` to `to` in 0.25 mm steps. */
function sizes(from: number, to: number): number[] {
  const out: number[] = []
  for (let d = from; d <= to + 1e-9; d += 0.25) out.push(Math.round(d * 100) / 100)
  return out
}

const id = (prefix: string, diameterMm: number, lengthMm: number) => `${prefix}-${diameterMm.toFixed(2)}x${lengthMm}`

function balloons(kind: BalloonKind, diameters: number[], lengths: number[]): Balloon[] {
  const prefix = kind === 'semi-compliant' ? 'sc' : 'nc'
  const chart = kind === 'semi-compliant' ? CHARTS.semiCompliant : CHARTS.nonCompliant
  return diameters.flatMap(diameterMm =>
    lengths.map(lengthMm => ({ id: id(prefix, diameterMm, lengthMm), category: 'balloon' as const, kind, diameterMm, lengthMm, chart })),
  )
}

export const BALLOONS: Balloon[] = [
  ...balloons('semi-compliant', sizes(2, 4), [12, 15, 20]),
  ...balloons('non-compliant', sizes(2, 4.5), [8, 12, 15]),
]

export const STENTS: Stent[] = sizes(2.25, 4).flatMap(diameterMm =>
  [8, 12, 15, 18, 23, 28, 33, 38].map(lengthMm => ({
    id: id('des', diameterMm, lengthMm),
    category: 'stent' as const,
    diameterMm,
    lengthMm,
    chart: CHARTS.stent,
  })),
)

const BY_ID = new Map<string, Device>([...BALLOONS, ...STENTS].map(device => [device.id, device]))

export function deviceById(id: string): Device | undefined {
  return BY_ID.get(id)
}

export function deviceName(device: Device): string {
  const size = `${device.diameterMm.toFixed(2)} × ${device.lengthMm} mm`
  if (device.category === 'stent') return `Drug-eluting stent ${size}`
  return `${device.kind === 'semi-compliant' ? 'Semi-compliant' : 'Non-compliant'} balloon ${size}`
}
