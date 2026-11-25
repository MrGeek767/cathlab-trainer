import type { AngleState, PresetView } from '@/types/angles'
import { VIEW_PRESETS } from '@/data/presets'

interface PresetButtonsProps {
  currentAngles: AngleState
  onSelectPreset: (preset: PresetView) => void
  /** Tooltips say what each view shows; challenges turn them off because they give answers away. */
  showHints?: boolean
}

function isActivePreset(preset: PresetView, current: AngleState, threshold = 8): boolean {
  return (
    Math.abs(preset.raoLao - current.raoLao) < threshold &&
    Math.abs(preset.cranialCaudal - current.cranialCaudal) < threshold
  )
}

export function PresetButtons({ currentAngles, onSelectPreset, showHints = true }: PresetButtonsProps) {
  const groups = [
    { label: 'Left coronary', presets: VIEW_PRESETS.filter(p => p.targetSystem === 'left') },
    { label: 'Right coronary', presets: VIEW_PRESETS.filter(p => p.targetSystem === 'right') },
    { label: 'Baseline', presets: VIEW_PRESETS.filter(p => p.targetSystem === 'both') },
  ].filter(group => group.presets.length > 0)

  return (
    <div className="flex flex-col gap-2">
      {groups.map(group => (
        <div key={group.label} className={group.presets.length === 1 ? 'flex items-center justify-between gap-2' : ''}>
          <div className={group.presets.length === 1 ? 'text-xs text-ink-faint' : 'mb-1 text-xs text-ink-faint'}>{group.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {group.presets.map(p => (
              <PresetButton
                key={p.id}
                preset={p}
                showHint={showHints}
                isActive={isActivePreset(p, currentAngles)}
                onClick={() => onSelectPreset(p)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PresetButton({
  preset,
  isActive,
  showHint,
  onClick,
}: {
  preset: PresetView
  isActive: boolean
  showHint: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={showHint ? `${preset.description}\n${preset.angleRange}` : undefined}
      aria-pressed={isActive}
      className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 active:scale-[0.97] ${
        isActive
          ? 'bg-drape-deep text-white ring-1 ring-drape'
          : 'bg-raised text-ink-soft ring-1 ring-line hover:bg-line hover:text-ink'
      }`}
    >
      {preset.shortName}
    </button>
  )
}
