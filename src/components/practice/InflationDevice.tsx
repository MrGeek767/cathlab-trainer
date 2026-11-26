import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { Device } from '@/data/devices'
import { chartRows, diameterAt } from '@/practice/compliance'
import { MAX_ATM, type InflationState, type OperatorCall, type PracticeAction } from '@/practice/session'

interface InflationDeviceProps {
  device: Device
  inflation: InflationState
  call: OperatorCall | null
  onAction: (action: PracticeAction) => void
}

/** Holding Inflate raises the pressure this much a second... */
const HOLD_ATM_PER_S = 2.5
/** ...in steps this often. */
const HOLD_TICK_MS = 50
const KEY_STEP_ATM = 1
const WHEEL_STEP_ATM = 0.5

/** Pressures are dialled to a tenth of an atmosphere. */
const tenth = (atm: number) => Math.round(atm * 10) / 10
/** "13", or "12.5" when there is a fraction. */
export function formatAtm(atm: number): string {
  const value = tenth(atm)
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * The inflation device (plan Task 11): the operator's call, a 0–30 atm gauge with the
 * region past rated burst pressure marked, the pressure and the diameter it gives, and the
 * compliance chart with the current row marked. Hold Inflate to raise the pressure; ↑ and ↓
 * step 1 atm and the wheel half an atm while it has focus. It takes focus when it opens
 * and hands it back when it closes.
 */
export function InflationDevice({ device, inflation, call, onAction }: InflationDeviceProps) {
  const ref = useRef<HTMLElement>(null)
  const stripRef = useRef<HTMLOListElement>(null)
  const latest = useRef({ atm: inflation.atm, onAction })
  useEffect(() => {
    latest.current = { atm: inflation.atm, onAction }
  })
  const setPressure = (atm: number) => latest.current.onAction({ type: 'set-pressure', atm: tenth(atm) })

  // Take focus on opening; on closing, hand it back to whatever opened it (the monitor, or
  // an Inflate button), so keyboard users carry on where they were.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.focus()
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  // Hold to inflate.
  const ramp = useRef<{ timer: number; atm: number } | null>(null)
  const stopRamp = () => {
    if (ramp.current) window.clearInterval(ramp.current.timer)
    ramp.current = null
  }
  const startRamp = () => {
    stopRamp()
    const state = { atm: latest.current.atm, timer: 0 }
    state.timer = window.setInterval(() => {
      state.atm = Math.min(state.atm + (HOLD_ATM_PER_S * HOLD_TICK_MS) / 1000, MAX_ATM)
      setPressure(state.atm)
    }, HOLD_TICK_MS)
    ramp.current = state
  }
  useEffect(() => stopRamp, [])
  // The question about going past rated burst pressure stops the hand.
  useEffect(() => {
    if (inflation.needsConfirm) stopRamp()
  }, [inflation.needsConfirm])

  // The wheel: a native listener, because React's wheel events can't stop the page scrolling.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (!el.contains(document.activeElement) || e.deltaY === 0) return
      e.preventDefault()
      setPressure(latest.current.atm + (e.deltaY < 0 ? WHEEL_STEP_ATM : -WHEEL_STEP_ATM))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  const rows = chartRows(device)
  const current = Math.round(inflation.atm)
  const diameter = diameterAt(device, inflation.atm)
  const overRbp = inflation.atm > device.chart.rbpAtm

  // Keep the current row of the chart in view.
  useEffect(() => {
    const strip = stripRef.current
    const cell = strip?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!strip || !cell) return
    strip.scrollLeft = cell.offsetLeft - strip.clientWidth / 2 + cell.clientWidth / 2
  }, [current])

  return (
    <section
      ref={ref}
      tabIndex={0}
      aria-label="Inflation device"
      onKeyDown={e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        setPressure(latest.current.atm + (e.key === 'ArrowUp' ? KEY_STEP_ATM : -KEY_STEP_ATM))
      }}
      className="flex animate-panel-in gap-3 rounded-xl border border-white/10 bg-panel/60 p-3 text-ink shadow-lg backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-drape"
    >
      <Gauge atm={inflation.atm} nominalAtm={device.chart.nominalAtm} rbpAtm={device.chart.rbpAtm} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {call && (
          <p className="text-sm">
            <span className="text-ink-soft">Operator: </span>
            {call.text}
          </p>
        )}
        <p className="flex items-baseline gap-3 font-display tabular-nums">
          <span className={`text-2xl font-semibold ${overRbp ? 'text-alarm' : 'text-white'}`}>{formatAtm(inflation.atm)} atm</span>
          <span className="text-base text-ink-soft">{diameter > 0 ? `${diameter.toFixed(2)} mm` : 'Not open yet'}</span>
        </p>
        <ol ref={stripRef} aria-label="Compliance chart" className="relative flex gap-0.5 overflow-x-auto pb-1 font-display text-xs tabular-nums">
          {rows.map(row => {
            const mark = row.atm === device.chart.nominalAtm ? 'NOM' : row.atm === device.chart.rbpAtm ? 'RBP' : ''
            const isCurrent = row.atm === current
            return (
              <li
                key={row.atm}
                aria-current={isCurrent ? 'true' : undefined}
                className={`flex min-w-9 shrink-0 flex-col items-center rounded px-1 py-0.5 ${isCurrent ? 'bg-drape text-white' : 'text-ink-soft'}`}
              >
                <span className={`text-[0.625rem] leading-3 ${isCurrent ? 'text-white/80' : 'text-ink-faint'}`}>{mark || ' '}</span>
                <span>{row.atm}</span>
                <span className={isCurrent ? 'text-white' : 'text-ink'}>{row.diameterMm.toFixed(2)}</span>
              </li>
            )
          })}
        </ol>
        {inflation.needsConfirm && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-alarm">Above rated burst pressure. Go higher?</span>
            <button
              type="button"
              onClick={() => onAction({ type: 'confirm-over-rbp' })}
              className="rounded-lg px-3 py-1 font-medium text-alarm ring-1 ring-alarm/60 transition-colors duration-150 hover:bg-alarm/15"
            >
              Go higher
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={startRamp}
            onPointerUp={stopRamp}
            onPointerLeave={stopRamp}
            onPointerCancel={stopRamp}
            onContextMenu={e => e.preventDefault()}
            // Held with a mouse or finger it ramps; Enter or Space (detail 0) steps 1 atm.
            onClick={(e: ReactMouseEvent) => {
              if (e.detail === 0) setPressure(latest.current.atm + KEY_STEP_ATM)
            }}
            className="select-none rounded-lg bg-drape px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-150 [touch-action:manipulation] hover:bg-drape-deep"
          >
            Inflate
          </button>
          <button
            type="button"
            onClick={() => onAction({ type: 'deflate' })}
            className="rounded-lg px-4 py-1.5 text-sm font-medium ring-1 ring-white/15 transition-colors duration-150 hover:bg-raised/80"
          >
            Deflate
          </button>
          <span className="ml-auto hidden self-center text-xs text-ink-faint sm:inline">Hold Inflate, or use ↑ ↓</span>
        </div>
      </div>
    </section>
  )
}

const START_DEG = 135
const SWEEP_DEG = 270
const angleOf = (atm: number) => START_DEG + (SWEEP_DEG * Math.min(Math.max(atm, 0), MAX_ATM)) / MAX_ATM
const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180
  return { x: 60 + r * Math.cos(rad), y: 60 + r * Math.sin(rad) }
}

/** The manometer: 0 to 30 atm over three quarters of a turn, past RBP marked. */
function Gauge({ atm, nominalAtm, rbpAtm }: { atm: number; nominalAtm: number; rbpAtm: number }) {
  const from = polar(angleOf(rbpAtm), 53)
  const to = polar(angleOf(MAX_ATM), 53)
  const large = angleOf(MAX_ATM) - angleOf(rbpAtm) > 180 ? 1 : 0
  const nominalOuter = polar(angleOf(nominalAtm), 57)
  const nominalInner = polar(angleOf(nominalAtm), 50)
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="h-24 w-24 shrink-0 self-center sm:h-28 sm:w-28">
      <circle cx="60" cy="60" r="58" className="fill-room/80 stroke-line" strokeWidth="1.5" />
      <path d={`M ${from.x} ${from.y} A 53 53 0 ${large} 1 ${to.x} ${to.y}`} className="fill-none stroke-alarm" strokeWidth="3.5" />
      {Array.from({ length: MAX_ATM + 1 }, (_, v) => {
        const major = v % 5 === 0
        const a = polar(angleOf(v), major ? 41 : 45)
        const b = polar(angleOf(v), 50)
        return (
          <line
            key={v}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={major ? 'stroke-ink' : 'stroke-ink-faint'}
            strokeWidth={major ? 1.6 : 0.8}
          />
        )
      })}
      {[0, 5, 10, 15, 20, 25, 30].map(v => {
        const p = polar(angleOf(v), 32)
        return (
          <text key={v} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-ink-soft font-display text-[9px]">
            {v}
          </text>
        )
      })}
      <line x1={nominalInner.x} y1={nominalInner.y} x2={nominalOuter.x} y2={nominalOuter.y} className="stroke-white" strokeWidth="2.2" />
      <text x="60" y="84" textAnchor="middle" className="fill-ink-faint font-display text-[8px]">
        atm
      </text>
      <g
        style={{ transform: `rotate(${angleOf(atm)}deg)`, transformOrigin: '60px 60px' }}
        className="transition-transform duration-100 ease-out motion-reduce:transition-none"
      >
        <line x1="54" y1="60" x2="104" y2="60" className="stroke-drape" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <circle cx="60" cy="60" r="4.5" className="fill-drape" />
    </svg>
  )
}
