import { CREATOR, DISCLAIMER } from '@/data/credits'

/** The disclaimer and the creator's credit, on every screen. Everyone else is credited in About. */
export function AppFooter() {
  return (
    <footer className="shrink-0 px-4 pb-2 text-center text-xs text-ink-faint">
      <span className="text-ink-soft">{DISCLAIMER}</span> Created by {CREATOR}.
    </footer>
  )
}
