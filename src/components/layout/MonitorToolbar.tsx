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
      <Segmented label="Image" size="sm" options={IMAGES} value={props.viewMode} onChange={props.onViewMode} />
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
      {fluoro && props.realFluoroLocked && <span className="text-xs text-ink-faint">Exams use real fluoro</span>}
      <span className="flex-1" />
      <Toggle label="Labels" pressed={props.labels} onChange={props.onLabels} title="Name every segment on the image" />
      {fluoro && (
        <Toggle label="Invert" pressed={props.inverted} onChange={props.onInverted} title="Show contrast white on black" />
      )}
      <Toggle label="Heartbeat" pressed={props.heartbeat} onChange={props.onHeartbeat} title="Move the heart with each beat" />
    </div>
  )
}
