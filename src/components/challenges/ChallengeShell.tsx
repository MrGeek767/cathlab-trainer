import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ArterySegment } from '@/types/anatomy'
import type { AngleState } from '@/types/angles'
import type { ShowMeResult } from '@/challenges/show-me'
import { segmentLabel } from '@/challenges/name-segment'
import {
  BEST_KEY,
  CHALLENGE_KINDS,
  buildRun,
  readBest,
  summarizeSession,
  type ChallengeKind,
  type ChallengeMode,
  type RunItem,
} from '@/challenges/session'
import { VIEW_PRESETS } from '@/data/presets'
import { DISCLAIMER } from '@/data/credits'
import { loadJSON, saveJSON } from '@/utils/safe-storage'
import { formatView } from '@/utils/format-view'
import { Segmented } from '@/components/ui/Segmented'
import { ShowMePanel } from './ShowMePanel'
import { NameSegmentPanel } from './NameSegmentPanel'
import { KIND_LABEL, ResultsBody, type AnswerRecord } from './ResultsBody'

interface ChallengeShellProps {
  segments: ArterySegment[]
  angles: AngleState
  animateTo: (angles: AngleState) => void
  onHighlightChange: (segmentId: string | null) => void
  /** Told whether an exam is running (exams use real fluoro); false when the shell closes. */
  onExamChange?: (exam: boolean) => void
  /** The monitor shows arteries only while contrast flows. */
  realFluoro?: boolean
}



interface Run {
  id: number
  kind: ChallengeKind
  mode: ChallengeMode
  segments: ArterySegment[]
  items: RunItem[]
  index: number
  answers: AnswerRecord[]
}

let runCount = 0

function newRun(kind: ChallengeKind, mode: ChallengeMode, segments: ArterySegment[]): Run {
  runCount += 1
  return { id: runCount, kind, mode, segments, items: buildRun(kind, segments, Math.random), index: 0, answers: [] }
}

function loadBest(): Record<ChallengeKind, number> {
  return readBest(loadJSON<unknown>(BEST_KEY, null))
}

/** Kind tabs, Learner/Exam toggle and ten items per run, then a results screen. */
export function ChallengeShell({
  segments,
  angles,
  animateTo,
  onHighlightChange,
  onExamChange,
  realFluoro = false,
}: ChallengeShellProps) {
  const [run, setRun] = useState<Run>(() => newRun('show-me', 'learner', segments))
  const [best, setBest] = useState(loadBest)

  // A dominance change swaps the vessel set, so the run's questions no longer fit: start over.
  if (run.segments !== segments) setRun(newRun(run.kind, run.mode, segments))

  const finished = run.index >= run.items.length
  const current = finished ? undefined : run.items[run.index]
  const answered = run.answers.length > run.index
  const learner = run.mode === 'learner'
  const exam = run.mode === 'exam'
  useEffect(() => {
    onExamChange?.(exam)
  }, [exam, onExamChange])
  useEffect(() => () => onExamChange?.(false), [onExamChange])

  const record = (answer: AnswerRecord) =>
    setRun(r => (r.answers.length > r.index ? r : { ...r, answers: [...r.answers, answer] }))

  const next = () => {
    const nextIndex = run.index + 1
    if (nextIndex >= run.items.length && run.mode === 'exam') {
      const { percent } = summarizeSession(run.answers)
      const stored = loadBest()
      const updated = { ...stored, [run.kind]: Math.max(stored[run.kind], percent) }
      saveJSON(BEST_KEY, updated)
      setBest(updated)
    }
    setRun({ ...run, index: nextIndex })
  }

  const labelOf = (id: string) => {
    const segment = segments.find(s => s.id === id)
    return segment ? segmentLabel(segment) : id
  }

  const onShot = (item: Extract<RunItem, { kind: 'show-me' }>['item'], result: ShowMeResult) =>
    record({
      kind: 'show-me',
      itemId: item.id,
      correct: result.passed,
      prompt: item.prompt,
      yourAnswer: `${formatView(angles.raoLao, angles.cranialCaudal)} (${result.rating})`,
      rightAnswer: `Best view ${formatView(result.best.raoLao, result.best.cranialCaudal)}`,
    })

  const onName = (question: Extract<RunItem, { kind: 'name-segment' }>['question'], correct: boolean) => {
    const preset = VIEW_PRESETS.find(p => p.id === question.presetId)
    record({
      kind: 'name-segment',
      itemId: question.segmentId,
      correct,
      prompt: `Highlighted segment, ${question.side} injection${preset ? `, ${formatView(preset.raoLao, preset.cranialCaudal)}` : ''}`,
      yourAnswer: null,
      rightAnswer: labelOf(question.answer),
    })
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 flex flex-col gap-2.5 px-4 pt-4 pb-3 border-b border-line">
        <Segmented
          label="Challenge"
          options={CHALLENGE_KINDS.map(kind => ({ value: kind, label: KIND_LABEL[kind] }))}
          value={run.kind}
          onChange={kind => setRun(newRun(kind, run.mode, segments))}
        />
        <div className="flex items-center justify-between gap-3">
          <Segmented
            label="Mode"
            size="sm"
            options={[
              { value: 'learner', label: 'Learner', title: 'Feedback after every item' },
              { value: 'exam', label: 'Exam', title: 'Real fluoro, results at the end' },
            ]}
            value={run.mode}
            onChange={mode => setRun(newRun(run.kind, mode, segments))}
          />
          <span className="text-xs text-ink-faint">Best exam score {best[run.kind]}%</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-room ring-1 ring-line"
            role="progressbar"
            aria-label="Progress"
            aria-valuemin={0}
            aria-valuemax={run.items.length}
            aria-valuenow={run.answers.length}
          >
            <div
              className="h-full rounded-full bg-drape transition-[width] duration-300 ease-out"
              style={{ width: `${(run.answers.length / Math.max(1, run.items.length)) * 100}%` }}
            />
          </div>
          <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-ink-soft">
            {finished ? 'Done' : `${run.index + 1} / ${run.items.length}`}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {finished && (
          <Results
            run={run}
            best={best}
            onNewRun={() => setRun(newRun(run.kind, run.mode, segments))}
          />
        )}
        {current?.kind === 'show-me' && (
          <ShowMePanel
            key={`${run.id}-${run.index}`}
            item={current.item}
            segments={segments}
            raoLao={angles.raoLao}
            cranialCaudal={angles.cranialCaudal}
            revealFeedback={learner}
            realFluoro={realFluoro}
            onSubmit={result => onShot(current.item, result)}
            onGoToBest={(raoLao, cranialCaudal) => animateTo({ raoLao, cranialCaudal })}
          />
        )}
        {current?.kind === 'name-segment' && (
          <NameSegmentPanel
            key={`${run.id}-${run.index}`}
            question={current.question}
            segments={segments}
            revealFeedback={learner}
            onAnswer={correct => onName(current.question, correct)}
            animateTo={animateTo}
            onHighlightChange={onHighlightChange}
          />
        )}
      </div>

      {!finished && answered && (
        <div className="shrink-0 p-3 border-t border-line">
          <button
            onClick={next}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-drape-deep text-white hover:bg-drape transition-colors"
          >
            {run.index + 1 >= run.items.length ? 'See results' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}

function Results({ run, best, onNewRun }: { run: Run; best: Record<ChallengeKind, number>; onNewRun: () => void }) {
  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4 text-ink">
      <ResultsBody mode={run.mode} kind={run.kind} answers={run.answers} best={best} />
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-raised text-ink hover:bg-line transition-colors"
        >
          Print results
        </button>
        <button
          onClick={onNewRun}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-drape-deep text-white hover:bg-drape transition-colors"
        >
          New run
        </button>
      </div>
      {createPortal(
        <div className="hidden print:block p-8 text-black bg-white">
          <h1 className="text-xl font-bold">CathLab Trainer: challenge results</h1>
          <p className="mb-4 text-sm">{new Date().toLocaleString()}</p>
          <ResultsBody mode={run.mode} kind={run.kind} answers={run.answers} best={best} print />
          <p className="mt-6 text-xs">{DISCLAIMER}</p>
        </div>,
        document.body,
      )}
    </div>
  )
}

