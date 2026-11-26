import type { KeyboardEvent, ReactNode } from 'react'
import type { AppMode } from '@/types/angles'
import { arrowTarget, useSlidingIndicator } from '@/components/ui/useSlidingIndicator'

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
)

export const MODE_TABS: { mode: AppMode; label: string; icon: ReactNode }[] = [
  // A C-arm turning around the patient.
  { mode: 'explore', label: 'Explore', icon: icon(<><circle cx="12" cy="12" r="8" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /><circle cx="12" cy="12" r="2" /></>) },
  { mode: 'guided', label: 'Learn', icon: icon(<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>) },
  { mode: 'quiz', label: 'Quiz', icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" /><path d="M12 17h.01" /></>) },
  { mode: 'challenges', label: 'Challenges', icon: icon(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>) },
  { mode: 'cathlab', label: 'Cath lab', icon: icon(<><path d="M4 20c3-1 4-4 4-7V6a2 2 0 0 1 4 0v4" /><path d="M12 10c0 3 2 5 5 5h3" /><circle cx="20" cy="15" r="1.2" /><path d="M6.5 6h3" /></>) },
]

export const panelId = (mode: AppMode) => `panel-${mode}`

/** The main tabs. The underline slides to the active tab. */
export function ModeTabs({ value, onChange }: { value: AppMode; onChange: (mode: AppMode) => void }) {
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(value)
  const index = MODE_TABS.findIndex(tab => tab.mode === value)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = arrowTarget(event.key, Math.max(0, index), MODE_TABS.length)
    if (next === null) return
    event.preventDefault()
    const tab = MODE_TABS[next]
    if (!tab) return
    onChange(tab.mode)
    containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div ref={containerRef} role="tablist" aria-label="Modes" onKeyDown={onKeyDown} className="relative flex h-full items-stretch">
      {MODE_TABS.map(tab => {
        const selected = tab.mode === value
        return (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(tab.mode)}
            tabIndex={selected ? 0 : -1}
            data-active={selected}
            onClick={() => onChange(tab.mode)}
            title={tab.label}
            className={`flex items-center gap-2 px-3 text-base font-medium transition-colors duration-150 md:px-4 ${
              selected ? 'text-ink' : 'text-ink-faint hover:text-ink-soft'
            }`}
          >
            <span className={`transition-colors duration-150 ${selected ? 'text-drape' : ''}`}>{tab.icon}</span>
            {/* Phones get icons only; the name stays for screen readers and as a tooltip. */}
            <span className="sr-only md:not-sr-only">{tab.label}</span>
          </button>
        )
      })}
      {box && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-[3px] rounded-t bg-drape transition-[transform,width] duration-200 ease-out"
          style={{ width: box.width, transform: `translateX(${box.left}px)` }}
        />
      )}
    </div>
  )
}
