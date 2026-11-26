import type { DominanceType } from '@/types/angles'
import { Segmented } from '@/components/ui/Segmented'

interface DominanceToggleProps {
  value: DominanceType
  onChange: (v: DominanceType) => void
  /** Why dominance can't change right now; unlocked when absent. */
  lock?: string
}

const OPTIONS: { value: DominanceType; label: string; title: string }[] = [
  { value: 'right', label: 'Right', title: 'Right dominant: the RCA gives the PDA' },
  { value: 'left', label: 'Left', title: 'Left dominant: the circumflex gives the PDA' },
  { value: 'codominant', label: 'Co-dominant', title: 'Co-dominant: both supply the inferior wall' },
]

export function DominanceToggle({ value, onChange, lock }: DominanceToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <Segmented label="Dominance" size="sm" options={OPTIONS} value={value} onChange={onChange} disabled={lock !== undefined} />
      {lock && <p className="text-xs text-ink-faint">{lock}</p>}
    </div>
  )
}
