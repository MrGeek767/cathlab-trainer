import type { SegmentRating } from '@/types/quality'

/**
 * One look for view ratings everywhere. Green steps for useful views, grey for
 * occasionally useful, red for not recommended; the +/− symbols always show too,
 * so the colour is never the only cue.
 */
export const RATING_BADGE: Record<SegmentRating, string> = {
  '+++': 'bg-ecg/15 text-ecg ring-1 ring-ecg/40',
  '++': 'bg-ecg/[0.07] text-[#A6EBC8] ring-1 ring-ecg/25',
  '+': 'bg-raised text-ink-soft ring-1 ring-line',
  '-': 'bg-alarm/10 text-alarm ring-1 ring-alarm/30',
}

export const RATING_WORD: Record<SegmentRating, string> = {
  '+++': 'Ideal',
  '++': 'Good',
  '+': 'Fair',
  '-': 'Poor',
}

/** Right and wrong answers, on the same green and red as the ratings. */
export const ANSWER_BADGE = {
  right: 'bg-ecg/15 text-ecg ring-1 ring-ecg/40',
  wrong: 'bg-alarm/10 text-alarm ring-1 ring-alarm/30',
} as const
