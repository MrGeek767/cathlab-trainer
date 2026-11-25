import { formatOblique, formatTilt } from '@/utils/format-view'
import { EcgTrace } from './EcgTrace'

interface MonitorOverlayProps {
  raoLao: number
  cranialCaudal: number
  /** Fluoro readouts; off for the diagram. */
  fluoro: boolean
  /** A contrast run is being acquired: cine mode and the X-ray lamp. */
  acquiring: boolean
  /** Cine frame counter while acquiring. */
  frame: { index: number; total: number } | null
  heartRate: number
  /** Real fluoro shows vessels only with contrast; road map always. */
  realFluoro: boolean
  dominanceLabel: string
  /** Real fluoro between runs: remind the learner how to see the arteries. */
  injectHint?: boolean
}

const SHADOW = '[text-shadow:0_0_3px_#000,0_1px_2px_#000]'

/** The text a real system burns into the image corners, in its usual capitals. */
export function MonitorOverlay(props: MonitorOverlayProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 font-display text-white sm:p-4 ${SHADOW}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide sm:text-base">TRAINING PATIENT</div>
          <div className="text-xs opacity-80 sm:text-sm">{props.dominanceLabel.toUpperCase()}</div>
        </div>
        <div className="text-right text-lg font-semibold tabular-nums tracking-wide sm:text-2xl">
          {formatOblique(props.raoLao)}&nbsp;&nbsp;{formatTilt(props.cranialCaudal).toUpperCase()}
        </div>
      </div>
      {props.fluoro && props.injectHint && (
        <p className="mx-auto animate-panel-in rounded-full bg-black/60 px-3 py-1 font-sans text-xs text-white/90 [text-shadow:none] sm:text-sm">
          Arteries show only while contrast flows. Press <span className="font-semibold text-xray">Inject contrast</span>.
        </p>
      )}
      {props.fluoro && (
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold tabular-nums tracking-wide sm:text-base">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-full ${props.acquiring ? 'animate-lamp bg-xray shadow-[0_0_10px_#FFB21A]' : 'bg-white/30'}`}
            />
            <span className={props.acquiring ? 'text-xray' : ''}>{props.acquiring ? 'CINE 15 F/S' : 'FLUORO 15 P/S'}</span>
            {props.frame && (
              <span className="opacity-90">
                F {props.frame.index}/{props.frame.total}
              </span>
            )}
          </div>
          <EcgTrace heartRate={props.heartRate} className="mb-1 hidden h-9 min-w-0 max-w-[44%] flex-1 sm:block" />
          <div className="text-right leading-tight">
            <div className="text-base font-semibold tabular-nums text-ecg sm:text-lg">HR {props.heartRate}</div>
            <div className="text-xs opacity-80 sm:text-sm">{props.realFluoro ? 'REAL FLUORO' : 'ROAD MAP'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
