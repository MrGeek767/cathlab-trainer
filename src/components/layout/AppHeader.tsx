import type { AppMode } from '@/types/angles'
import { ModeTabs } from './ModeTabs'

interface AppHeaderProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  onAbout: () => void
}

/** A C-arm over a heart: the brand mark. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
      <path d="M6 22a10 10 0 0 1 20 0" fill="none" stroke="#4C9BE8" strokeWidth="3" strokeLinecap="round" />
      <rect x="3.5" y="21" width="5" height="4" rx="1" fill="#4C9BE8" />
      <rect x="23.5" y="21" width="5" height="4" rx="1" fill="#4C9BE8" />
      <path d="M16 24.5c-3-2-4.5-3.6-4.5-5.3a2.3 2.3 0 0 1 4.5-.9 2.3 2.3 0 0 1 4.5.9c0 1.7-1.5 3.3-4.5 5.3z" fill="#FFB21A" />
    </svg>
  )
}

export function AppHeader({ mode, onModeChange, onAbout }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-stretch justify-between gap-4 border-b border-line bg-panel/70 px-4">
      <div className="flex items-center gap-2.5">
        <Mark />
        <h1 className="font-display text-2xl font-semibold tracking-wide text-ink">CathLab Trainer</h1>
        <span className="rounded px-1.5 py-0.5 text-xs text-xray ring-1 ring-xray/50">Beta</span>
      </div>
      <nav aria-label="Main" className="flex items-stretch">
        <ModeTabs value={mode} onChange={onModeChange} />
      </nav>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onAbout}
          className="rounded-md px-3 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:bg-raised hover:text-ink"
        >
          About
        </button>
      </div>
    </header>
  )
}
