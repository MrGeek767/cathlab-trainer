import type { InjectionSide } from '@/utils/contrast'
import { Segmented } from '@/components/ui/Segmented'

interface CineControlsProps {
  side: InjectionSide
  onSideChange: (side: InjectionSide) => void
  playing: boolean
  onPlay: () => void
  onStop: () => void
}

const SIDES: { value: InjectionSide; label: string }[] = [
  { value: 'left', label: 'Left coronary' },
  { value: 'right', label: 'Right coronary' },
]

/** Pick the coronary to inject, then run contrast. Amber means the X-ray is on. */
export function CineControls({ side, onSideChange, playing, onPlay, onStop }: CineControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Segmented label="Injection side" size="sm" options={SIDES} value={side} onChange={onSideChange} />
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
