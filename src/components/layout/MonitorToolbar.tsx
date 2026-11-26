import type { ViewMode } from '@/types/angles'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'

interface MonitorToolbarProps {
  viewMode: ViewMode
  onViewMode: (mode: ViewMode) => void
  realFluoro: boolean
  onRealFluoro: (real: boolean) => void
  /** Why the image is fixed (an exam, the practice); null when free. */
  imageLock: string | null
  /** Exams also fix the vessels switch on Real fluoro. */
  realFluoroLocked: boolean
  labels: boolean
  onLabels: (on: boolean) => void
  /** Why labels are forced on or off right now (Learn, a question, an exam). */
  labelsLock: string | null
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
        disabled={props.imageLock !== null}
      />
      {/* The lock sits after the last control it fixes: the image alone in the practice, both in an exam. */}
      {props.imageLock && !props.realFluoroLocked && <LockNote reason={props.imageLock} />}
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
      {props.imageLock && props.realFluoroLocked && <LockNote reason={props.imageLock} />}
      <span className="flex-1" />
      {/* The diagram always names its segments, so the switch belongs to fluoro. */}
      {fluoro && (
        <Toggle
          label="Labels"
          pressed={props.labels}
          onChange={props.onLabels}
          lock={props.labelsLock}
          title="Name every segment on the image"
        />
      )}
      {fluoro && (
        <Toggle label="Invert" pressed={props.inverted} onChange={props.onInverted} title="Show contrast white on black" />
      )}
      {fluoro && (
        <Toggle label="Motion" pressed={props.heartbeat} onChange={props.onHeartbeat} title="Move the heart and coronaries with each beat" />
      )}
    </div>
  )
}

/** A padlock that says, on hover and to screen readers, why the controls before it are fixed. */
function LockNote({ reason }: { reason: string }) {
  return (
    <span title={reason} className="inline-flex items-center text-ink-faint">
      <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
      </svg>
      <span className="sr-only">{reason}</span>
    </span>
  )
}
