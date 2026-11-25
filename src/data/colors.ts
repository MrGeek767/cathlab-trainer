/**
 * Artery colours, validated with the dataviz palette checks against the dark panels:
 * the three territories use the three hues that pass every pairing in both colour-vision
 * simulations (LAD orange, LCx blue, RCA aqua). No fourth hue passes alongside them, so
 * the left main, the short trunk between LAD and LCx, is a neutral light grey. Branches
 * are small steps of their territory's hue; the diagram labels every vessel as well.
 */
export const VESSEL_COLORS = {
  LM:  '#C9D3DE',
  LAD: '#E76624',
  D1:  '#EC7B40',
  D2:  '#F0905C',
  SEP: '#C9551C',
  LCx: '#338CED',
  OM1: '#4F9CF0',
  OM2: '#6CADF3',
  RCA: '#00A888',
  AM:  '#1DBA9A',
  PDA: '#00967A',
  PLV: '#00846B',
} as const
