import { useState } from 'react'
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
import { ShowMePanel } from './ShowMePanel'
import { NameSegmentPanel } from './NameSegmentPanel'

interface ChallengeShellProps {
  segments: ArterySegment[]
  angles: AngleState
  animateTo: (angles: AngleState) => void
  onHighlightChange: (segmentId: string | null) => void
}

const KIND_LABEL: Record<ChallengeKind, string> = {
  'show-me': 'Show me',
  'name-segment': 'Name the segment',
}

/** One answered item, as the results screen lists it. */
interface AnswerRecord {
  kind: ChallengeKind
  itemId: string
  correct: boolean
  prompt: string
  /** What the learner did, when known (Name the segment reports only right or wrong). */
  yourAnswer: string | null
  rightAnswer: string
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
export function ChallengeShell({ segments, angles, animateTo, onHighlightChange }: ChallengeShellProps) {
  const [run, setRun] = useState<Run>(() => newRun('show-me', 'learner', segments))
  const [best, setBest] = useState(loadBest)

  // A dominance change swaps the vessel set, so the run's questions no longer fit: start over.
  if (run.segments !== segments) setRun(newRun(run.kind, run.mode, segments))

  const finished = run.index >= run.items.length
  const current = finished ? undefined : run.items[run.index]
  const answered = run.answers.length > run.index
  const learner = run.mode === 'learner'

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
    <div className="h-full min-h-0 flex flex-col bg-gray-900/80 border-l border-gray-800/50">
      <div className="shrink-0 flex flex-col gap-2 px-3 pt-3 pb-2 border-b border-gray-800/50">
        <div className="flex gap-1">
          {CHALLENGE_KINDS.map(kind => (
            <button
              key={kind}
              onClick={() => setRun(newRun(kind, run.mode, segments))}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                run.kind === kind ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {KIND_LABEL[kind]}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {(['learner', 'exam'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setRun(newRun(run.kind, mode, segments))}
                className={`px-2 py-0.5 text-[11px] rounded-md capitalize transition-all ${
                  run.mode === mode ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-gray-500">
            {finished ? 'Done' : `Item ${run.index + 1} of ${run.items.length}`} · Best exam {best[run.kind]}%
          </div>
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
        <div className="shrink-0 p-3 border-t border-gray-800/50">
          <button
            onClick={next}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
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
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4 text-gray-200">
      <ResultsBody run={run} best={best} />
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
        >
          Print results
        </button>
        <button
          onClick={onNewRun}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          New run
        </button>
      </div>
      {createPortal(
        <div className="hidden print:block p-8 text-black bg-white">
          <h1 className="text-xl font-bold">CathLab Trainer: challenge results</h1>
          <p className="mb-4 text-sm">{new Date().toLocaleString()}</p>
          <ResultsBody run={run} best={best} />
          <p className="mt-6 text-xs">{DISCLAIMER}</p>
        </div>,
        document.body,
      )}
    </div>
  )
}

function ResultsBody({ run, best }: { run: Run; best: Record<ChallengeKind, number> }) {
  const summary = summarizeSession(run.answers)
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest opacity-60">
          {run.mode === 'exam' ? 'Exam results' : 'Practice results'} · {KIND_LABEL[run.kind]}
        </div>
        <div className="mt-1 text-3xl font-bold">
          {summary.correct} / {summary.total} <span className="text-lg font-semibold opacity-70">({summary.percent}%)</span>
        </div>
      </div>
      <ul className="text-xs flex flex-col gap-0.5">
        {CHALLENGE_KINDS.filter(kind => summary.byKind[kind].total > 0).map(kind => (
          <li key={kind}>
            {KIND_LABEL[kind]}: {summary.byKind[kind].correct} of {summary.byKind[kind].total}
          </li>
        ))}
        <li className="opacity-70">
          Best exam scores: {CHALLENGE_KINDS.map(kind => `${KIND_LABEL[kind]} ${best[kind]}%`).join(' · ')}
        </li>
      </ul>
      <ol className="flex flex-col gap-2 text-xs">
        {run.answers.map((answer, i) => (
          <li key={`${answer.itemId}-${i}`} className="flex gap-2">
            <span className={`shrink-0 font-bold ${answer.correct ? 'text-emerald-500' : 'text-red-500'}`}>
              {answer.correct ? '✓' : '✗'}
            </span>
            <span>
              {i + 1}. {answer.prompt}
              {answer.yourAnswer && <><br />Your shot: {answer.yourAnswer}</>}
              <br />
              Answer: {answer.rightAnswer}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
