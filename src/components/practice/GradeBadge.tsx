import { GRADE_LABEL, type Grade } from '@/practice/grades'

const LOOK: Record<Grade, { symbol: string; className: string }> = {
  best: { symbol: '✓', className: 'bg-ecg/15 text-ecg ring-1 ring-ecg/40' },
  acceptable: { symbol: '✓', className: 'bg-raised text-ink ring-1 ring-line' },
  'not-suitable': { symbol: '–', className: 'bg-raised text-ink-soft ring-1 ring-line' },
  unsafe: { symbol: '✗', className: 'bg-alarm/10 text-alarm ring-1 ring-alarm/40' },
}

/** A grade as a small pill: symbol and word, so it never depends on colour alone. */
export function GradeBadge({ grade }: { grade: Grade }) {
  const look = LOOK[grade]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${look.className}`}>
      <span aria-hidden>{look.symbol}</span>
      {GRADE_LABEL[grade]}
    </span>
  )
}
