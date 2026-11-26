import { STENTS, type Balloon, type Device, type Stent } from '@/data/devices'
import { worseGrade, type Grade, type Note, type ReferenceId } from './grades'
import { RESPONSE } from './inflation'

/** Where the practice is: each step names the inflation the learner does next. */
export type PracticeStep = 'predilate' | 'stent' | 'postdilate' | 'final' | 'done'

export interface SizingContext {
  proximalRefMm: number
  distalRefMm: number
  lesionLengthMm: number
  /** The placed stent's labelled diameter, once there is one. */
  stentDiameterMm: number | null
}

const EPS = 1e-9
const STENT_LENGTHS = [...new Set(STENTS.map(s => s.lengthMm))].sort((a, b) => a - b)

function note(grade: Grade, title: string, text: string, reference: ReferenceId): Note {
  return { key: 'pick', grade, title, text, reference }
}

/** A balloon chosen to prepare the lesion (design §7.4: two accepted approaches). */
function preparation(balloon: Balloon, ctx: SizingContext): Note {
  const ratio = balloon.diameterMm / ctx.distalRefMm
  const [low, high] = balloon.kind === 'semi-compliant' ? [0.8, 1] : [0.9, 1.1]
  if (ratio > 1.1 + EPS) {
    return note('unsafe', 'Too big for predilation', 'A balloon wider than the vessel risks dissecting it.', 'cit-2024')
  }
  if (ratio < low - EPS) {
    return note(
      'acceptable',
      'Small for predilation',
      'It opens the lesion less, so the stent may need more pressure or post-dilation.',
      'cit-2024',
    )
  }
  if (ratio <= high + EPS) {
    return balloon.kind === 'semi-compliant'
      ? note(
          'best',
          'Good choice for predilation',
          'A semi-compliant balloon at about 0.8 to 1 times the vessel size prepares the lesion with little risk of dissection.',
          'cit-2024',
        )
      : note('best', 'Good choice for predilation', 'A non-compliant balloon at about 1:1 prepares the lesion evenly.', 'cit-2024')
  }
  return note(
    'acceptable',
    'Large for a semi-compliant balloon',
    'It is the vessel’s size or a little over; semi-compliant balloons grow with pressure, so keep it near nominal.',
    'cit-2024',
  )
}

/** A stent chosen for the lesion: diameter against the distal reference, length against the lesion. */
function stentSize(stent: Stent, ctx: SizingContext): Note {
  const diff = stent.diameterMm - ctx.distalRefMm
  const diameter: [Grade, string] =
    Math.abs(diff) <= 0.15 + EPS
      ? ['best', 'Its diameter matches the distal reference.']
      : diff < 0 && diff >= -0.4 - EPS
        ? ['acceptable', 'It is a little small for the vessel and will likely need post-dilation.']
        : diff > 0
          ? ['not-suitable', 'It is wider than the distal reference, which risks edge dissection.']
          : ['not-suitable', 'It is too small for the vessel and would stay under-expanded.']

  const needed = ctx.lesionLengthMm + 2 * RESPONSE.landingMm
  const bestLength = STENT_LENGTHS.find(length => length >= needed)
  const nextLength = STENT_LENGTHS.find(length => bestLength !== undefined && length > bestLength)
  const length: [Grade, string] =
    stent.lengthMm < needed
      ? ['not-suitable', `It is shorter than the ${needed} mm needed to cover the lesion with ${RESPONSE.landingMm} mm to spare at each end.`]
      : stent.lengthMm === bestLength
        ? ['best', `Its length covers the lesion with ${RESPONSE.landingMm} mm or more to spare at each end.`]
        : stent.lengthMm === nextLength
          ? ['acceptable', 'It is longer than needed; more metal covers healthy vessel.']
          : ['not-suitable', 'It is far longer than needed and covers side branches for no reason.']

  const grade = worseGrade(diameter[0], length[0])
  const title = { best: 'Stent well sized', acceptable: 'Stent acceptable', 'not-suitable': 'Stent not suitable', unsafe: 'Stent unsafe' }[grade]
  const reference: ReferenceId = length[0] === 'not-suitable' && stent.lengthMm < needed ? 'stllr-2008' : 'sizing-review'
  return note(grade, title, `${diameter[1]} ${length[1]}`, reference)
}

/** A balloon chosen to post-dilate the stent. */
function postDilation(balloon: Balloon, ctx: SizingContext): Note {
  if (balloon.kind === 'semi-compliant') {
    return note(
      'not-suitable',
      'Use a non-compliant balloon',
      'Semi-compliant balloons keep growing at high pressure and can injure the vessel beyond the stent.',
      'sizing-review',
    )
  }
  const stentDiameter = ctx.stentDiameterMm ?? ctx.distalRefMm
  if (balloon.diameterMm > ctx.proximalRefMm + 0.1 + EPS) {
    return note('not-suitable', 'Too big for post-dilation', 'A balloon wider than the proximal vessel risks edge dissection.', 'sizing-review')
  }
  if (balloon.diameterMm < stentDiameter - EPS) {
    return note('not-suitable', 'Too small to expand the stent', 'A balloon smaller than the stent won’t expand it any further.', 'sizing-review')
  }
  return note(
    'best',
    'Good post-dilation balloon',
    'A non-compliant balloon the size of the vessel lets you use high pressure safely.',
    'sizing-review',
  )
}

/** The grade and the reason for picking `device` at `step` (design §7.4 and §7.5). */
export function gradePick(step: PracticeStep, device: Device, ctx: SizingContext): Note {
  if (device.category === 'stent') {
    if (step === 'predilate') {
      return note(
        'acceptable',
        'Direct stenting',
        'Stenting without predilation is accepted for a focal, non-calcified lesion, but the stent may expand less.',
        'cit-2024',
      )
    }
    return stentSize(device, ctx)
  }
  return step === 'postdilate' || step === 'final' ? postDilation(device, ctx) : preparation(device, ctx)
}
