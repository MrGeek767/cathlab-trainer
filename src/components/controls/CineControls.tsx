import type { InjectionSide } from '@/utils/contrast'
import { Segmented } from '@/components/ui/Segmented'

interface CineControlsProps {
  side: InjectionSide
  onSideChange: (side: InjectionSide) => void
  /** Why the side can't be changed right now (a question picks it); unlocked when absent. */
  sideLock?: string
  playing: boolean
  onPlay: () => void
  onStop: () => void
}

const SIDES: { value: InjectionSide; label: string }[] = [
  { value: 'left', label: 'Left coronary' },
  { value: 'right', label: 'Right coronary' },
]

/** Pick the coronary to inject, then run contrast. Amber means the X-ray is on. */
export function CineControls({ side, onSideChange, sideLock, playing, onPlay, onStop }: CineControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Segmented
        label="Injection side"
        size="sm"
        options={SIDES}
        value={side}
        onChange={onSideChange}
        disabled={sideLock !== undefined}
      />
      {sideLock && (
        <p className="flex items-center gap-1.5 text-xs text-ink-faint">
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
          {sideLock}
        </p>
      )}
      <button
        type="button"
        onClick={playing ? onStop : onPlay}
        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-[filter,background-color,transform] duration-150 active:scale-[0.98] ${
          playing ? 'bg-raised text-xray ring-1 ring-xray/60' : 'bg-xray text-room hover:brightness-110'
        }`}
      >
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${playing ? 'animate-lamp bg-xray shadow-[0_0_8px_#FFB21A]' : 'bg-room/70'}`} />
        {playing ? 'Stop run' : 'Inject contrast'}
      </button>
    </div>
  )
}
