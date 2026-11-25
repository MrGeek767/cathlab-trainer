import type { KeyboardEvent, ReactNode } from 'react'
import { arrowTarget, useSlidingIndicator } from './useSlidingIndicator'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  title?: string
}

interface SegmentedProps<T extends string> {
  /** Read out by screen readers; the visible label sits outside, next to the control. */
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** drape: an ordinary choice. xray: a choice about the X-ray beam or contrast. */
  tone?: 'drape' | 'xray'
  size?: 'sm' | 'md'
  /** Shown but locked, for example when an exam fixes the choice. */
  disabled?: boolean
}

/** A row of mutually exclusive choices with a highlight that slides to the chosen one. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'drape',
  size = 'md',
  disabled = false,
}: SegmentedProps<T>) {
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(value)
  const index = options.findIndex(option => option.value === value)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const next = arrowTarget(event.key, Math.max(0, index), options.length)
    if (next === null) return
    event.preventDefault()
    const option = options[next]
    if (!option) return
    onChange(option.value)
    containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      className={`relative flex rounded-lg bg-room/70 p-1 ring-1 ring-line ${disabled ? 'opacity-60' : ''}`}
    >
      {box && (
        <span
          aria-hidden
          className={`absolute left-0 top-1 bottom-1 rounded-md transition-[transform,width] duration-200 ease-out ${
            tone === 'xray' ? 'bg-xray/90' : 'bg-drape-deep'
          }`}
          style={{ width: box.width, transform: `translateX(${box.left}px)` }}
        />
      )}
      {options.map(option => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-active={checked}
            title={option.title}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex-1 whitespace-nowrap rounded-md font-medium transition-colors duration-150 ${
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
            } ${checked ? (tone === 'xray' ? 'text-room' : 'text-white') : 'text-ink-soft hover:text-ink'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
