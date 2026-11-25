/** C-arm angles in the words the fluoro monitor uses, e.g. "LAO 45" and "CAUD 30". */
export function formatOblique(raoLao: number): string {
  if (Math.abs(raoLao) < 1) return 'AP'
  return raoLao < 0 ? `RAO ${Math.abs(Math.round(raoLao))}` : `LAO ${Math.round(raoLao)}`
}

export function formatTilt(cranialCaudal: number): string {
  if (Math.abs(cranialCaudal) < 1) return 'Straight'
  return cranialCaudal < 0 ? `CAUD ${Math.abs(Math.round(cranialCaudal))}` : `CRAN ${Math.round(cranialCaudal)}`
}

/** "LAO 45 / CAUD 30" */
export function formatView(raoLao: number, cranialCaudal: number): string {
  return `${formatOblique(raoLao)} / ${formatTilt(cranialCaudal)}`
}
