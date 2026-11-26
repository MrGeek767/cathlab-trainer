import { Fragment, useEffect, useRef, useState } from 'react'
import { BALLOONS, STENTS, deviceName, type BalloonKind, type Device } from '@/data/devices'
import { chartRows } from '@/practice/compliance'
import { PRACTICE_REFERENCES } from '@/practice/grades'
import { PRACTICE_WORKING_VIEW } from '@/practice/app-rules'
import { formatView } from '@/utils/format-view'
import type { PracticeAction, PracticeState } from '@/practice/session'
import type { PracticeStep } from '@/practice/sizing'
import { Segmented } from '@/components/ui/Segmented'
import { GradeBadge } from './GradeBadge'

interface PracticePanelProps {
  state: PracticeState
  onAction: (action: PracticeAction) => void
  /** Plays the final contrast run; the panel then records the result. */
  onFinalShot: () => void
}

const STEPS: { step: Exclude<PracticeStep, 'done'>; label: string; optional?: boolean }[] = [
  { step: 'predilate', label: 'Predilate', optional: true },
  { step: 'stent', label: 'Stent' },
  { step: 'postdilate', label: 'Post-dilate', optional: true },
  { step: 'final', label: 'Final shot' },
]
const ORDER: PracticeStep[] = ['predilate', 'stent', 'postdilate', 'final', 'done']

type ShelfView = 'balloons' | 'stents'

const BUTTON =
  'rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-line transition-colors duration-150 enabled:hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50'

/** The Cath lab practice: steps, the device shelf, the device in hand and the notes (plan Task 10). */
export function PracticePanel({ state, onAction, onFinalShot }: PracticePanelProps) {
  const [view, setView] = useState<ShelfView>('balloons')
  const [kind, setKind] = useState<BalloonKind>('semi-compliant')

  // A new note is the feedback on what the learner just did: when the panel scrolls (on
  // larger screens), bring it into view. On a phone the page scrolls instead, and the
  // learner stays at the monitor.
  const boxRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<HTMLElement>(null)
  const noteCount = state.notes.length
  const seen = useRef(noteCount)
  useEffect(() => {
    const grew = noteCount > seen.current
    seen.current = noteCount
    const box = boxRef.current
    const notes = notesRef.current
    if (!grew || !box || !notes || box.scrollHeight <= box.clientHeight) return
    const top = notes.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    box.scrollTop = Math.max(0, top - 8)
  }, [noteCount])
  const current = ORDER.indexOf(state.step)
  const canFinish = (state.step === 'postdilate' || state.step === 'final') && state.vessel.stent !== null && !state.inflation

  const shelfLock = state.inflation
    ? 'Deflate before you change devices.'
    : state.step === 'done'
      ? 'Start again to practise once more.'
      : null
  const stentLock = state.vessel.stent ? 'One stent covers this lesion. Post-dilate the stent you placed instead.' : null

  const devices: Device[] = view === 'stents' ? STENTS : BALLOONS.filter(b => b.kind === kind)
  const diameters = [...new Set(devices.map(d => d.diameterMm))]
  const lengths = [...new Set(devices.map(d => d.lengthMm))].sort((a, b) => a - b)
  const locked = shelfLock ?? (view === 'stents' ? stentLock : null)

  return (
    <div ref={boxRef} className="flex h-full scroll-smooth flex-col gap-4 overflow-y-auto p-4 text-ink motion-reduce:scroll-auto">
      <div>
        <h2 className="text-base font-semibold text-white">Practice: proximal LAD</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          The operator has seated a 6F EBU 3.5 guide in the left main, parked a workhorse wire in the distal LAD and set the working
          view, {formatView(PRACTICE_WORKING_VIEW.raoLao, PRACTICE_WORKING_VIEW.cranialCaudal)}. Prepare and stent the lesion.
        </p>
      </div>

      <section aria-label="Steps">
        <ol className="flex flex-col gap-1">
          {STEPS.map((item, i) => {
            const status = i < current ? 'done' : i === current ? 'current' : 'next'
            return (
              <li
                key={item.step}
                className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${status === 'current' ? 'bg-drape-soft text-ink ring-1 ring-drape/50' : 'text-ink-soft'}`}
              >
                <span aria-hidden className={`w-4 text-center ${status === 'done' ? 'text-ecg' : 'text-ink-faint'}`}>
                  {status === 'done' ? '✓' : i + 1}
                </span>
                <span>
                  {item.label}
                  {item.optional && <span className="text-ink-faint"> (optional)</span>}
                </span>
                <span className="sr-only">{status === 'done' ? ', done' : status === 'current' ? ', current step' : ''}</span>
              </li>
            )
          })}
        </ol>
        <div className="mt-2 flex flex-wrap gap-2">
          {state.step === 'predilate' && (
            <button type="button" className={BUTTON} disabled={!!state.inflation} onClick={() => onAction({ type: 'skip' })}>
              Stent directly
            </button>
          )}
          {state.step === 'postdilate' && (
            <button type="button" className={BUTTON} disabled={!!state.inflation} onClick={() => onAction({ type: 'skip' })}>
              Skip post-dilation
            </button>
          )}
          <button
            type="button"
            disabled={!canFinish}
            onClick={onFinalShot}
            className="rounded-lg bg-xray px-3 py-1.5 text-sm font-bold text-room transition-[filter] duration-150 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-raised disabled:text-ink-faint"
          >
            Final shot
          </button>
        </div>
      </section>

      {state.inHand && <InHand device={state.inHand} inflating={!!state.inflation} onAction={onAction} />}

      <section aria-label="Shelf" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Shelf</h3>
        <Segmented
          label="Device type"
          size="sm"
          options={[
            { value: 'balloons', label: 'Balloons' },
            { value: 'stents', label: 'Stents' },
          ]}
          value={view}
          onChange={setView}
        />
        {view === 'balloons' && (
          <Segmented
            label="Balloon type"
            size="sm"
            options={[
              { value: 'semi-compliant', label: 'Semi-compliant' },
              { value: 'non-compliant', label: 'Non-compliant' },
            ]}
            value={kind}
            onChange={setKind}
          />
        )}
        {locked && <p className="text-xs text-ink-faint">{locked}</p>}
        <p className="text-xs text-ink-faint">Rows are diameters, buttons are lengths, both in mm.</p>
        {/* Laid out like the shelf itself: one row per diameter, one column per length. */}
        <div
          role="group"
          aria-label={view === 'stents' ? 'Stent sizes' : 'Balloon sizes'}
          className={`grid gap-1 ${view === 'stents' ? '' : 'max-w-60'}`}
          style={{ gridTemplateColumns: `2.75rem repeat(${lengths.length}, minmax(0, 1fr))` }}
        >
          {diameters.map(diameter => (
            <Fragment key={diameter}>
              <span className="self-center font-display text-sm tabular-nums text-ink-soft">{diameter.toFixed(2)}</span>
              {lengths.map(length => {
                const device = devices.find(d => d.diameterMm === diameter && d.lengthMm === length)
                if (!device) return <span key={length} />
                const held = state.inHand?.id === device.id
                return (
                  <button
                    key={device.id}
                    type="button"
                    aria-label={deviceName(device)}
                    aria-pressed={held}
                    disabled={locked !== null}
                    onClick={() => onAction({ type: 'pick', device })}
                    className={`rounded py-1 font-display text-xs tabular-nums transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                      held ? 'bg-drape text-white' : 'bg-room/70 text-ink ring-1 ring-line enabled:hover:bg-raised'
                    }`}
                  >
                    {device.lengthMm}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </section>

      <section ref={notesRef} aria-label="Notes" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Notes</h3>
        {state.notes.length === 0 && <p className="text-xs text-ink-faint">Pick a device from the shelf to begin.</p>}
        <ol className="flex flex-col gap-2">
          {[...state.notes].reverse().map(note => {
            const reference = note.reference ? PRACTICE_REFERENCES[note.reference] : null
            return (
              <li key={note.key} className="animate-panel-in rounded-lg bg-raised/50 p-2.5 text-xs leading-relaxed">
                <div className="flex items-center gap-2">
                  {note.grade && <GradeBadge grade={note.grade} />}
                  <span className="font-semibold text-ink">{note.title}</span>
                </div>
                <p className="mt-1 text-ink-soft">{note.text}</p>
                {reference &&
                  (reference.url ? (
                    <a href={reference.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-drape underline hover:text-ink">
                      {reference.label}
                    </a>
                  ) : (
                    <p className="mt-1 text-ink-faint">{reference.label}</p>
                  ))}
              </li>
            )
          })}
        </ol>
      </section>

      <button type="button" className={`${BUTTON} self-start`} disabled={!!state.inflation} onClick={() => onAction({ type: 'reset' })}>
        Start again
      </button>
    </div>
  )
}

/** The device in hand: its compliance chart and what to do with it. */
function InHand({ device, inflating, onAction }: { device: Device; inflating: boolean; onAction: (action: PracticeAction) => void }) {
  return (
    <section aria-label="In hand" className="rounded-xl bg-raised/60 p-3 ring-1 ring-line">
      <h3 className="text-sm font-semibold">{deviceName(device)}</h3>
      <p className="mt-0.5 text-xs text-ink-faint">
        Nominal {device.chart.nominalAtm} atm, rated burst {device.chart.rbpAtm} atm. Compliance values are illustrative.
      </p>
      {/* The chart from the box: the diameter at each pressure, split in two to stay short. */}
      <div className="mt-2 flex items-start gap-6">
        {halves(chartRows(device)).map((rows, i) => (
          <table key={i} className="font-display text-xs tabular-nums">
            <thead>
              <tr className="text-ink-faint">
                <th className="pr-4 text-left font-medium">atm</th>
                <th className="text-right font-medium">mm</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const mark = row.atm === device.chart.nominalAtm ? 'NOM' : row.atm === device.chart.rbpAtm ? 'RBP' : null
                return (
                  <tr key={row.atm} className={mark ? 'text-ink' : 'text-ink-soft'}>
                    <td className="pr-4">
                      {row.atm}
                      {mark && <span className="ml-1.5 text-ink-faint">{mark}</span>}
                    </td>
                    <td className="text-right">{row.diameterMm.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className={BUTTON} disabled={inflating} onClick={() => onAction({ type: 'inflate' })}>
          Inflate
        </button>
        <button type="button" className={BUTTON} disabled={inflating} onClick={() => onAction({ type: 'withdraw' })}>
          Withdraw
        </button>
      </div>
    </section>
  )
}

/** The first half of a list and the rest, for a chart laid out in two columns. */
function halves<T>(items: T[]): [T[], T[]] {
  const middle = Math.ceil(items.length / 2)
  return [items.slice(0, middle), items.slice(middle)]
}
