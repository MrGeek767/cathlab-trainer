import { useEffect, useRef, useState } from 'react'
import type { ArterySegment } from '@/types/anatomy'
import type { SegmentRating } from '@/types/quality'
import { scoreShowMe, showMeVerdict, type ShowMeItem, type ShowMeResult } from '@/challenges/show-me'
import { OptimalViewMap } from '@/components/quality/OptimalViewMap'
import { formatView } from '@/utils/format-view'

interface ShowMePanelProps {
  item: ShowMeItem
  /** Used by the optimal-view map to name the segment. */
  segments: ArterySegment[]
  raoLao: number
  cranialCaudal: number
  revealFeedback: boolean
  onSubmit: (result: ShowMeResult) => void
  onGoToBest: (raoLao: number, cranialCaudal: number) => void
}

interface Shot {
  itemId: string
  raoLao: number
  cranialCaudal: number
  result: ShowMeResult
}

const RATING_STYLE: Record<SegmentRating, string> = {
  '+++': 'text-emerald-400 bg-emerald-500/10',
  '++': 'text-yellow-400 bg-yellow-500/10',
  '+': 'text-orange-400 bg-orange-500/10',
  '-': 'text-red-400 bg-red-500/10',
}

/** One "Show me" item: set the C-arm, take one shot, and (in learner mode) see how it rates. */
export function ShowMePanel({
  item,
  segments,
  raoLao,
  cranialCaudal,
  revealFeedback,
  onSubmit,
  onGoToBest,
}: ShowMePanelProps) {
  const [shot, setShot] = useState<Shot | null>(null)
  // One shot per item; a new item starts with none.
  const current = shot?.itemId === item.id ? shot : null
  const feedbackRef = useRef<HTMLDivElement>(null)

  // The panel is short on desktop, so bring the feedback into view once the shot is taken.
  useEffect(() => {
    if (current && revealFeedback) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current, revealFeedback])

  const takeShot = () => {
    const result = scoreShowMe(item.segmentId, raoLao, cranialCaudal)
    setShot({ itemId: item.id, raoLao, cranialCaudal, result })
    onSubmit(result)
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-900/80 border-l border-gray-800/50 p-4 flex flex-col gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-gray-500">Show me</div>
        <p className="mt-1 text-base font-semibold text-white">{item.prompt}</p>
        <p className="mt-1 text-xs text-gray-400">Move the C-arm until you like the view, then take the shot.</p>
      </div>

      <button
        onClick={takeShot}
        disabled={current !== null}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
      >
        {current ? 'Shot taken' : 'Take shot'}
      </button>

      {current && !revealFeedback && (
        <p className="text-xs text-gray-400">
          Shot taken at <span className="font-mono text-gray-200">{formatView(current.raoLao, current.cranialCaudal)}</span>.
        </p>
      )}

      {current && revealFeedback && (
        <div ref={feedbackRef} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className={`shrink-0 rounded-md px-2 py-1 font-mono text-sm font-bold ${RATING_STYLE[current.result.rating]}`}>
              {current.result.rating}
            </span>
            <p className="text-sm text-gray-200">{showMeVerdict(current.result)}</p>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
            <div>
              Your shot: <span className="font-mono text-gray-200">{formatView(current.raoLao, current.cranialCaudal)}</span>
              <br />
              Best view:{' '}
              <span className="font-mono text-gray-200">
                {formatView(current.result.best.raoLao, current.result.best.cranialCaudal)}
              </span>
            </div>
            <button
              onClick={() => onGoToBest(current.result.best.raoLao, current.result.best.cranialCaudal)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
            >
              Go to best view
            </button>
          </div>
          <OptimalViewMap
            segments={segments}
            segmentId={item.segmentId}
            raoLao={raoLao}
            cranialCaudal={cranialCaudal}
            onPick={onGoToBest}
          />
        </div>
      )}
    </div>
  )
}
