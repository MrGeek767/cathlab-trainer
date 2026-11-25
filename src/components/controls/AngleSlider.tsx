interface AngleSliderProps {
  label: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  leftLabel: string
  rightLabel: string
}

/** One C-arm axis: a large readout and a slider centred on 0. */
export function AngleSlider({ label, min, max, value, onChange, leftLabel, rightLabel }: AngleSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100
  const centerPercentage = ((0 - min) / (max - min)) * 100

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className="font-display text-xl font-semibold leading-none tabular-nums text-ink">
          {formatAngle(value, leftLabel)}
        </span>
      </div>
      <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-ink-faint">{leftLabel}</span>
      <div className="relative flex h-7 flex-1 items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-room ring-1 ring-line" />
        <div
          className="absolute h-4 w-0.5 rounded-full bg-ink-faint"
          style={{ left: `${centerPercentage}%`, transform: 'translateX(-50%)' }}
        />
        <div
          className="absolute h-2 rounded-full bg-drape/60"
          style={{
            left: `${Math.min(percentage, centerPercentage)}%`,
            width: `${Math.abs(percentage - centerPercentage)}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="relative z-10 w-full bg-transparent"
          aria-label={label}
          aria-valuetext={formatAngle(value, leftLabel)}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-ink-faint">{rightLabel}</span>
      </div>
    </div>
  )
}

function formatAngle(value: number, leftLabel: string): string {
  if (leftLabel === 'RAO') {
    if (value === 0) return 'AP'
    return value < 0 ? `RAO ${Math.abs(value)}°` : `LAO ${value}°`
  }
  if (value === 0) return 'Straight'
  return value < 0 ? `Caudal ${Math.abs(value)}°` : `Cranial ${value}°`
}
