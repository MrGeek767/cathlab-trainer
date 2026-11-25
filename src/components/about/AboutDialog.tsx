import { useEffect, useRef } from 'react'
import { CREDITS, REFERENCES, SIMPLIFICATIONS, DISCLAIMER, NON_AFFILIATION } from '@/data/credits'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

const LINK = 'text-drape underline hover:text-ink'

/** Credits, sources, simplifications and the disclaimer. */
export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-panel p-5 text-sm text-ink shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="about-title" className="text-lg font-bold text-white">
            About CathLab Trainer
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-ink-soft hover:bg-raised hover:text-ink"
          >
            Close
          </button>
        </div>
        <p className="mt-2 font-medium text-ink">{DISCLAIMER}</p>
        <p className="mt-1 text-xs text-ink-soft">{NON_AFFILIATION}</p>

        <h3 className="mt-4 text-xs font-semibold text-ink-faint">Built on</h3>
        <ul className="mt-1 flex flex-col gap-1">
          {CREDITS.map(credit => (
            <li key={credit.item}>
              <a href={credit.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                {credit.item}
              </a>{' '}
              by {credit.author}. {credit.licence}.
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-xs font-semibold text-ink-faint">Sources for the answers</h3>
        <ul className="mt-1 flex flex-col gap-1">
          {REFERENCES.map(reference => (
            <li key={reference.url}>
              <a href={reference.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                {reference.label}
              </a>
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-xs font-semibold text-ink-faint">What is simplified</h3>
        <ul className="mt-1 list-disc pl-5 flex flex-col gap-1">
          {SIMPLIFICATIONS.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
