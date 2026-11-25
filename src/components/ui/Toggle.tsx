interface ToggleProps {
  label: string
  pressed: boolean
  onChange: (pressed: boolean) => void
  title?: string
}

/** An on/off button; the dot lights in the selection colour when it is on. */
export function Toggle({ label, pressed, onChange, title }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={() => onChange(!pressed)}
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 active:scale-[0.97] ${
        pressed ? 'bg-drape-soft text-ink ring-1 ring-drape/60' : 'text-ink-soft ring-1 ring-line hover:bg-raised hover:text-ink'
      }`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full transition-colors duration-150 ${pressed ? 'bg-drape' : 'bg-ink-faint/60'}`} />
      {label}
    </button>
  )
}
