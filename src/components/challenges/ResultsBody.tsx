import { CHALLENGE_KINDS, summarizeSession, type ChallengeKind, type ChallengeMode } from '@/challenges/session'
import { useCountUp } from '@/hooks/useCountUp'
import { ANSWER_BADGE } from '@/components/ui/rating'

export const KIND_LABEL: Record<ChallengeKind, string> = {
  'show-me': 'Show me',
  'name-segment': 'Name the segment',
}

/** One answered item, as the results screen lists it. */
export interface AnswerRecord {
  kind: ChallengeKind
  itemId: string
  correct: boolean
  prompt: string
  /** What the learner did, when known (Name the segment reports only right or wrong). */
  yourAnswer: string | null
  rightAnswer: string
}

/** Screen and print styles. Print has no animation (a printer captures the first frame) and dark ink. */
const LOOK = {
  screen: {
    block: 'animate-panel-in',
    heading: 'text-ink-soft',
    score: 'text-white',
    scoreNote: 'text-ink-soft',
    track: 'bg-raised',
    bar: 'animate-grow bg-ecg',
    best: 'text-ink-faint',
    item: 'animate-panel-in rounded-lg bg-raised/50',
    right: ANSWER_BADGE.right,
    wrong: ANSWER_BADGE.wrong,
    detail: 'text-ink-soft',
    prompt: 'text-ink',
  },
  print: {
    block: '',
    heading: 'text-neutral-700',
    score: 'text-black',
    scoreNote: 'text-neutral-700',
    track: 'bg-neutral-200',
    bar: 'bg-neutral-800',
    best: 'text-neutral-600',
    item: 'rounded-lg border border-neutral-300',
    right: 'text-black ring-1 ring-black',
    wrong: 'text-black ring-1 ring-black',
    detail: 'text-neutral-700',
    prompt: 'text-black',
  },
} as const

export function ResultsBody({
  mode,
  kind,
  answers,
  best,
  print = false,
}: {
  mode: ChallengeMode
  kind: ChallengeKind
  answers: AnswerRecord[]
  best: Record<ChallengeKind, number>
  print?: boolean
}) {
  const look = print ? LOOK.print : LOOK.screen
  const summary = summarizeSession(answers)
  const counting = { correct: useCountUp(summary.correct), percent: useCountUp(summary.percent) }
  // A printed page shows the final numbers, never a frame of the count-up.
  const shown = print ? summary : counting
  return (
    <div className="flex flex-col gap-4">
      <div className={look.block}>
        <h3 className={`text-sm ${look.heading}`}>
          {mode === 'exam' ? 'Exam results' : 'Practice results'}, {KIND_LABEL[kind]}
        </h3>
        <p className={`mt-1 font-display text-5xl font-semibold tabular-nums ${look.score}`}>
          {shown.percent}%
          <span className={`ml-3 text-xl font-medium ${look.scoreNote}`}>
            {shown.correct} of {summary.total} right
          </span>
        </p>
        <div className={`mt-3 h-2 overflow-hidden rounded-full ${look.track}`} aria-hidden>
          <div className={`h-full origin-left rounded-full ${look.bar}`} style={{ width: `${summary.percent}%` }} />
        </div>
        <p className={`mt-2 text-xs ${look.best}`}>
          Best exam scores: {CHALLENGE_KINDS.map(k => `${KIND_LABEL[k]} ${best[k]}%`).join(', ')}
        </p>
      </div>
      <ol className="flex flex-col gap-2 text-xs">
        {answers.map((answer, i) => (
          <li
            key={`${answer.itemId}-${i}`}
            className={`flex gap-2.5 p-2.5 ${look.item}`}
            style={print ? undefined : { animationDelay: `${Math.min(i, 9) * 40}ms` }}
          >
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                answer.correct ? look.right : look.wrong
              }`}
            >
              {answer.correct ? '✓' : '✗'}
              <span className="sr-only">{answer.correct ? 'right' : 'wrong'}</span>
            </span>
            <span className={`leading-relaxed ${look.detail}`}>
              <span className={look.prompt}>
                {i + 1}. {answer.prompt}
              </span>
              {answer.yourAnswer && (
                <>
                  <br />
                  Your shot: {answer.yourAnswer}
                </>
              )}
              <br />
              Answer: {answer.rightAnswer}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
