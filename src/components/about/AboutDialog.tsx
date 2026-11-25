import { useEffect, useRef } from 'react'
import { CREDITS, REFERENCES, SIMPLIFICATIONS, DISCLAIMER } from '@/data/credits'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

const LINK = 'text-indigo-300 underline hover:text-indigo-200'

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
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-5 text-sm text-gray-300 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="about-title" className="text-lg font-bold text-white">
            About CathLab Trainer
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            Close
          </button>
        </div>
        <p className="mt-2 font-medium text-amber-300">{DISCLAIMER}</p>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Built on</h3>
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

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Sources for the answers</h3>
        <ul className="mt-1 flex flex-col gap-1">
          {REFERENCES.map(reference => (
            <li key={reference.url}>
              <a href={reference.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                {reference.label}
              </a>
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-gray-500">What is simplified</h3>
        <ul className="mt-1 list-disc pl-5 flex flex-col gap-1">
          {SIMPLIFICATIONS.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
