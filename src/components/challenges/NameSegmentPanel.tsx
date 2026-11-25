import { useEffect, useRef, useState } from 'react'
import type { ArterySegment } from '@/types/anatomy'
import type { AngleState } from '@/types/angles'
import { VIEW_PRESETS } from '@/data/presets'
import { segmentLabel, type NameSegmentQuestion } from '@/challenges/name-segment'
import { formatView } from '@/utils/format-view'

interface NameSegmentPanelProps {
  question: NameSegmentQuestion
  segments: ArterySegment[]
  revealFeedback: boolean
  onAnswer: (correct: boolean) => void
  /** Moves the C-arm; called with the question's textbook view when the question opens. */
  animateTo: (angles: AngleState) => void
  /**
   * Highlights the target, which also shows only its side with labels and hover off.
   * Called with null when the question closes.
   */
  onHighlightChange: (segmentId: string | null) => void
}

type OptionState = 'idle' | 'right' | 'wrong' | 'chosen' | 'other'

const OPTION_STYLE: Record<OptionState, string> = {
  idle: 'bg-raised text-ink hover:bg-line',
  right: 'bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/50',
  wrong: 'bg-red-600/20 text-red-300 ring-1 ring-red-500/50',
  chosen: 'bg-drape-soft text-ink ring-1 ring-drape/60',
  other: 'bg-raised/60 text-ink-faint',
}

/** One "Name the segment" question: the target is highlighted; pick its name. */
export function NameSegmentPanel({
  question,
  segments,
  revealFeedback,
  onAnswer,
  animateTo,
  onHighlightChange,
}: NameSegmentPanelProps) {
  const [picked, setPicked] = useState<{ question: NameSegmentQuestion; id: string } | null>(null)
  // One answer per question; a new question starts unanswered.
  const choice = picked?.question === question ? picked.id : null

  // Keep the latest callbacks, so a parent re-render does not re-run the question setup.
  const animateRef = useRef(animateTo)
  const highlightRef = useRef(onHighlightChange)
  useEffect(() => {
    animateRef.current = animateTo
    highlightRef.current = onHighlightChange
  })

  const preset = VIEW_PRESETS.find(p => p.id === question.presetId)
  const feedbackRef = useRef<HTMLParagraphElement>(null)

  // The panel is short on desktop, so bring the verdict into view once answered.
  useEffect(() => {
    if (choice !== null) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [choice])

  useEffect(() => {
    if (preset) animateRef.current({ raoLao: preset.raoLao, cranialCaudal: preset.cranialCaudal })
    highlightRef.current(question.segmentId)
    return () => highlightRef.current(null)
  }, [question, preset])

  const labelOf = (id: string) => {
    const segment = segments.find(s => s.id === id)
    return segment ? segmentLabel(segment) : id
  }

  const pick = (id: string) => {
    if (choice !== null) return
    setPicked({ question, id })
    onAnswer(id === question.answer)
  }

  const stateOf = (id: string): OptionState => {
    if (choice === null) return 'idle'
    if (revealFeedback) {
      if (id === question.answer) return 'right'
      return id === choice ? 'wrong' : 'other'
    }
    return id === choice ? 'chosen' : 'other'
  }

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4">
      <div>
        <p className="mt-1 text-base font-semibold text-white">Which segment is highlighted?</p>
        <p className="mt-1 text-xs text-ink-soft">
          {question.side === 'left' ? 'Left' : 'Right'} coronary injection
          {preset && <>, <span className="font-display tabular-nums text-ink">{formatView(preset.raoLao, preset.cranialCaudal)}</span></>}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {question.options.map(id => (
          <button
            key={id}
            onClick={() => pick(id)}
            disabled={choice !== null}
            className={`px-3 py-2 rounded-lg text-left text-sm transition-colors disabled:cursor-default ${OPTION_STYLE[stateOf(id)]}`}
          >
            {labelOf(id)}
          </button>
        ))}
      </div>

      {choice !== null && revealFeedback && (
        <p ref={feedbackRef} className="text-sm text-ink">
          {choice === question.answer ? 'Correct.' : `Not quite. It is the ${labelOf(question.answer)}.`}
        </p>
      )}
      {choice !== null && !revealFeedback && (
        <p ref={feedbackRef} className="text-xs text-ink-soft">Answer recorded.</p>
      )}
    </div>
  )
}
