import type { Device } from '@/data/devices'

/** Below this a balloon or stent isn't open. */
const OPENING_ATM = 2

/** The device's diameter at `atm`, from its compliance chart: straight through nominal and RBP. */
export function diameterAt(device: Device, atm: number): number {
  if (!(atm >= OPENING_ATM)) return 0
  const { nominalAtm, rbpAtm, growthAtRbp } = device.chart
  return device.diameterMm * (1 + (growthAtRbp * (atm - nominalAtm)) / (rbpAtm - nominalAtm))
}

/** The pressure that gives `diameterMm` on the device's chart. */
export function pressureFor(device: Device, diameterMm: number): number {
  const { nominalAtm, rbpAtm, growthAtRbp } = device.chart
  return nominalAtm + ((diameterMm / device.diameterMm - 1) * (rbpAtm - nominalAtm)) / growthAtRbp
}

/** The chart as printed on the packet: whole atm from a little below nominal up to RBP. */
export function chartRows(device: Device): { atm: number; diameterMm: number }[] {
  const rows: { atm: number; diameterMm: number }[] = []
  for (let atm = Math.max(OPENING_ATM, device.chart.nominalAtm - 4); atm <= device.chart.rbpAtm; atm++) {
    rows.push({ atm, diameterMm: diameterAt(device, atm) })
  }
  return rows
}
