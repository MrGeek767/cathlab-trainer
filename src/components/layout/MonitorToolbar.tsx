import type { ViewMode } from '@/types/angles'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'

interface MonitorToolbarProps {
  viewMode: ViewMode
  onViewMode: (mode: ViewMode) => void
  realFluoro: boolean
  onRealFluoro: (real: boolean) => void
  /** Exams fix real fluoro on. */
  realFluoroLocked: boolean
  labels: boolean
  onLabels: (on: boolean) => void
  inverted: boolean
  onInverted: (on: boolean) => void
  heartbeat: boolean
  onHeartbeat: (on: boolean) => void
}

const IMAGES: { value: ViewMode; label: string }[] = [
  { value: 'fluoroscopy', label: 'Fluoro' },
  { value: 'schematic', label: 'Diagram' },
]

const VESSELS = [
  { value: 'roadmap', label: 'Road map', title: 'Vessels always drawn, for learning views' },
  { value: 'real', label: 'Real fluoro', title: 'Vessels show only while contrast flows, as in the lab' },
] as const

/** Display settings for the monitor, kept beside it rather than among the C-arm controls. */
export function MonitorToolbar(props: MonitorToolbarProps) {
  const fluoro = props.viewMode === 'fluoroscopy'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Image"
        size="sm"
        options={IMAGES}
        value={props.viewMode}
        onChange={props.onViewMode}
        disabled={props.realFluoroLocked}
      />
      {fluoro && (
        <Segmented
          label="Vessels"
          size="sm"
          options={[...VESSELS]}
          value={props.realFluoro ? 'real' : 'roadmap'}
          onChange={value => props.onRealFluoro(value === 'real')}
          disabled={props.realFluoroLocked}
        />
      )}
      {fluoro && props.realFluoroLocked && (
        <span title="Exams use real fluoro" className="inline-flex items-center text-ink-faint">
          <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
          <span className="sr-only">Exams use real fluoro</span>
        </span>
      )}
      <span className="flex-1" />
      <Toggle label="Labels" pressed={props.labels} onChange={props.onLabels} title="Name every segment on the image" />
      {fluoro && (
        <Toggle label="Invert" pressed={props.inverted} onChange={props.onInverted} title="Show contrast white on black" />
      )}
      {fluoro && (
        <Toggle label="Motion" pressed={props.heartbeat} onChange={props.onHeartbeat} title="Move the heart and coronaries with each beat" />
      )}
    </div>
  )
}
