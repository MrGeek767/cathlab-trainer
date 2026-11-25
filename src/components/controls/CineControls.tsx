import type { InjectionSide } from '@/utils/contrast'

interface CineControlsProps {
  side: InjectionSide
  onSideChange: (side: InjectionSide) => void
  playing: boolean
  onPlay: () => void
  onStop: () => void
}

const sides: { value: InjectionSide; label: string }[] = [
  { value: 'left', label: 'Left inj.' },
  { value: 'right', label: 'Right inj.' },
]

export function CineControls({ side, onSideChange, playing, onPlay, onStop }: CineControlsProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Cine</span>
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-800 rounded-lg p-0.5">
          {sides.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSideChange(opt.value)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                side === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={playing ? onStop : onPlay}
          className={`px-3 py-1 text-xs rounded-md transition-all ${
            playing ? 'bg-rose-700 text-white' : 'bg-emerald-700 text-white hover:bg-emerald-600'
          }`}
        >
          {playing ? 'Stop' : 'Run cine'}
        </button>
      </div>
    </div>
  )
}
