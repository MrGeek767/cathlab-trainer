import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'

interface DeviceButtonsProps {
  /** Nothing in hand yet: the buttons show where the controls are but do nothing. */
  disabled: boolean
  onMove: (deltaMm: number) => void
  onInflate: () => void
}

/** A held button waits this long before it starts repeating... */
const REPEAT_DELAY_MS = 300
/** ...then steps 1 mm this often, 12.5 mm a second. */
const REPEAT_EVERY_MS = 80

const BUTTON =
  'select-none whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 [touch-action:manipulation] disabled:cursor-not-allowed disabled:opacity-50'

/**
 * On-screen device controls for phones and anyone without a mouse (plan Task 11):
 * Pull back and Push step 1 mm and repeat while held; Inflate opens the inflation device.
 */
export function DeviceButtons({ disabled, onMove, onInflate }: DeviceButtonsProps) {
  const latest = useRef(onMove)
  useEffect(() => {
    latest.current = onMove
  })
  const timers = useRef<{ delay: number | null; repeat: number | null }>({ delay: null, repeat: null })

  const stop = () => {
    if (timers.current.delay !== null) window.clearTimeout(timers.current.delay)
    if (timers.current.repeat !== null) window.clearInterval(timers.current.repeat)
    timers.current = { delay: null, repeat: null }
  }
  useEffect(() => stop, [])
  useEffect(() => {
    if (disabled) stop()
  }, [disabled])

  const start = (deltaMm: number) => {
    stop()
    latest.current(deltaMm)
    timers.current.delay = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(() => latest.current(deltaMm), REPEAT_EVERY_MS)
    }, REPEAT_DELAY_MS)
  }

  const hold = (deltaMm: number) => ({
    onPointerDown: () => start(deltaMm),
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // A mouse or touch press has already stepped; a click from Enter or Space (detail 0) steps once.
    onClick: (e: ReactMouseEvent) => {
      if (e.detail === 0) latest.current(deltaMm)
    },
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  })

  return (
    <div
      title={disabled ? 'Pick a balloon or stent from the shelf first' : undefined}
      className="flex gap-1.5 rounded-xl border border-white/10 bg-panel/60 p-1.5 shadow-lg backdrop-blur-md"
    >
      <button type="button" disabled={disabled} className={`${BUTTON} text-ink ring-1 ring-white/10 enabled:hover:bg-raised/80`} {...hold(-1)}>
        Pull back
      </button>
      <button type="button" disabled={disabled} className={`${BUTTON} text-ink ring-1 ring-white/10 enabled:hover:bg-raised/80`} {...hold(1)}>
        Push
      </button>
      <button type="button" disabled={disabled} onClick={onInflate} className={`${BUTTON} bg-drape text-white enabled:hover:bg-drape-deep`}>
        Inflate
      </button>
    </div>
  )
}
