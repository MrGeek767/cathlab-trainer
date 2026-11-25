import type { ArterySegment } from '@/types/anatomy'
import type { CoronarySystem } from '@/types/angles'
import { QualityPanel } from '@/components/quality/QualityPanel'
import { OptimalViewMap } from '@/components/quality/OptimalViewMap'
import { Segmented } from '@/components/ui/Segmented'

interface ExplorePanelProps {
  raoLao: number
  cranialCaudal: number
  segments: ArterySegment[]
  system: CoronarySystem
  onSystem: (system: CoronarySystem) => void
  hoveredSegmentId: string | null
  selectedSegmentId: string | null
  onHoverSegment: (id: string | null) => void
  onPick: (raoLao: number, cranialCaudal: number) => void
}

const SYSTEMS: { value: CoronarySystem; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

/** Explore: how well the current view shows each segment, and where each is seen best. */
export function ExplorePanel(props: ExplorePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">This view</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          How well the current angle shows each segment, from published textbook tables. Turn the C-arm and watch the
          ratings change.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-soft">Show arteries</span>
        <Segmented label="Show arteries" size="sm" options={SYSTEMS} value={props.system} onChange={props.onSystem} />
      </div>
      <QualityPanel
        raoLao={props.raoLao}
        cranialCaudal={props.cranialCaudal}
        segments={props.segments}
        hoveredSegmentId={props.hoveredSegmentId}
        onHoverSegment={props.onHoverSegment}
      />
      <OptimalViewMap
        segments={props.segments}
        segmentId={props.selectedSegmentId ?? props.hoveredSegmentId}
        raoLao={props.raoLao}
        cranialCaudal={props.cranialCaudal}
        onPick={props.onPick}
      />
    </div>
  )
}
