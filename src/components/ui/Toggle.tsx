interface ToggleProps {
  label: string
  pressed: boolean
  onChange: (pressed: boolean) => void
  title?: string
  /** Why it can't be changed right now; it then shows its state but can't be pressed. */
  lock?: string | null
}

/** An on/off button; the dot lights in the selection colour when it is on. */
export function Toggle({ label, pressed, onChange, title, lock = null }: ToggleProps) {
  const locked = lock !== null
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={lock ?? title}
      disabled={locked}
      onClick={() => onChange(!pressed)}
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ${
        locked ? 'cursor-not-allowed opacity-60' : 'active:scale-[0.97]'
      } ${
        pressed
          ? 'bg-drape-soft text-ink ring-1 ring-drape/60'
          : `text-ink-soft ring-1 ring-line ${locked ? '' : 'hover:bg-raised hover:text-ink'}`
      }`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full transition-colors duration-150 ${pressed ? 'bg-drape' : 'bg-ink-faint/60'}`} />
      {label}
    </button>
  )
}
