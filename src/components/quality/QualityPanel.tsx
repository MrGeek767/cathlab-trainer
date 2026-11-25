import { useMemo } from 'react'
import type { ArterySegment } from '@/types/anatomy'
import type { SegmentRating } from '@/types/quality'
import { sampleSegments, gradeSampledSegments } from '@/utils/view-quality'
import { VESSEL_COLORS } from '@/data/colors'
import { RATING_BADGE, RATING_WORD } from '@/components/ui/rating'

interface QualityPanelProps {
  raoLao: number
  cranialCaudal: number
  segments: ArterySegment[]
  hoveredSegmentId: string | null
  onHoverSegment: (id: string | null) => void
}

export function QualityPanel({
  raoLao,
  cranialCaudal,
  segments,
  hoveredSegmentId,
  onHoverSegment,
}: QualityPanelProps) {
  // Sample the (angle-independent) centrelines only when the segment set changes,
  // so dragging the angle sliders re-grades without re-evaluating every spline.
  const sampled = useMemo(() => sampleSegments(segments), [segments])
  const qualities = useMemo(
    () => gradeSampledSegments(sampled, raoLao, cranialCaudal),
    [sampled, raoLao, cranialCaudal],
  )

  const qualityMap = useMemo(() => {
    const map = new Map<
      string,
      { rating: SegmentRating; overlaps: string[]; foreshortenPct?: number }
    >()
    for (const q of qualities) {
      map.set(q.segmentId, {
        rating: q.rating,
        overlaps: q.overlaps,
        foreshortenPct: q.foreshortenPct,
      })
    }
    return map
  }, [qualities])

  const groups: { label: string; color: string; segments: ArterySegment[] }[] = [
    { label: 'Left main and LAD', color: VESSEL_COLORS.LAD, segments: segments.filter(s => s.territory === 'LAD' || s.territory === 'LM') },
    { label: 'Circumflex', color: VESSEL_COLORS.LCx, segments: segments.filter(s => s.territory === 'LCx') },
    { label: 'Right coronary', color: VESSEL_COLORS.RCA, segments: segments.filter(s => s.territory === 'RCA') },
  ].filter(group => group.segments.length > 0)

  return (
    <div className="flex flex-col gap-4">
      {groups.map(group => (
        <section key={group.label}>
          <h3 className="mb-1.5 flex items-center gap-2 text-sm font-bold text-ink-soft">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
            {group.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {group.segments.map(segment => {
              const quality = qualityMap.get(segment.id)
              const rating = quality?.rating ?? '-'
              const hovered = hoveredSegmentId === segment.id
              const notes = [
                quality?.foreshortenPct != null ? `${Math.round(quality.foreshortenPct * 100)}% foreshortened` : null,
                quality?.overlaps.length ? `overlaps ${quality.overlaps.join(', ')}` : null,
              ].filter(Boolean)
              return (
                <li key={segment.id}>
                  <button
                    type="button"
                    onMouseEnter={() => onHoverSegment(segment.id)}
                    onMouseLeave={() => onHoverSegment(null)}
                    onFocus={() => onHoverSegment(segment.id)}
                    onBlur={() => onHoverSegment(null)}
                    onClick={() => onHoverSegment(hovered ? null : segment.id)}
                    title={notes.length ? `${segment.name}: ${notes.join('; ')}` : segment.name}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-150 ${
                      hovered ? 'bg-raised text-ink' : 'text-ink-soft hover:bg-raised/60 hover:text-ink'
                    }`}
                  >
                    <span className="truncate">{segment.name}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-display text-sm font-semibold tabular-nums ${RATING_BADGE[rating]}`}>
                      {rating} <span className="font-sans text-xs font-normal">{RATING_WORD[rating]}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
