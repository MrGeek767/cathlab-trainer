import { useState, useCallback } from 'react'
import type { QuizQuestion } from '@/types/quiz'
import { useQuizState } from '@/hooks/useQuizState'

interface QuizPanelProps {
  raoLao: number
  cranialCaudal: number
}

export function QuizPanel({ raoLao, cranialCaudal }: QuizPanelProps) {
  const { state, currentQuestion, submitAnswer, nextQuestion, resetQuiz, totalQuestions } = useQuizState()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const handleChoiceSubmit = useCallback(() => {
    if (!currentQuestion || !selectedOption) return
    const correct = selectedOption === currentQuestion.answer
    submitAnswer(correct)
  }, [currentQuestion, selectedOption, submitAnswer])

  const handleAngleCheck = useCallback(() => {
    if (!currentQuestion?.targetAngles) return
    const { raoLao: targetRL, cranialCaudal: targetCC, tolerance } = currentQuestion.targetAngles
    const primaryDiff = Math.abs(raoLao - targetRL)
    const secondaryDiff = Math.abs(cranialCaudal - targetCC)
    submitAnswer(primaryDiff <= tolerance && secondaryDiff <= tolerance)
  }, [currentQuestion, raoLao, cranialCaudal, submitAnswer])

  const handleNext = useCallback(() => {
    setSelectedOption(null)
    nextQuestion()
  }, [nextQuestion])

  const handleReset = useCallback(() => {
    setSelectedOption(null)
    resetQuiz()
  }, [resetQuiz])

  if (state.completed) {
    return (
      <div className="h-full overflow-y-auto p-4 flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-4xl font-bold text-white">
          {state.score} / {totalQuestions}
        </div>
        <p className="text-ink-soft">
          {state.score === totalQuestions
            ? 'Perfect score! You know your angiographic views.'
            : state.score >= totalQuestions * 0.7
              ? 'Great job! Solid understanding of coronary projections.'
              : 'Keep practicing — review the guided mode for tips.'}
        </p>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-drape-deep text-white rounded-lg text-sm font-medium hover:bg-drape transition-colors"
        >
          Restart Quiz
        </button>
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4 text-sm">
      {/* Score bar */}
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>Question {state.currentIndex + 1} / {totalQuestions}</span>
        <span key={state.score} className="animate-pop font-display text-sm tabular-nums text-ecg">Score {state.score}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-raised rounded-full overflow-hidden">
        <div
          className="h-full bg-drape transition-all duration-300"
          style={{ width: `${((state.currentIndex + (state.answered ? 1 : 0)) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question type badge */}
      <span className="self-start rounded px-2 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-line bg-raised">
        {currentQuestion.type === 'identify-view' ? 'Name the view' : currentQuestion.type === 'identify-vessel' ? 'Name the vessel' : 'Dial it'}
      </span>

      {/* Question prompt */}
      <p className="text-white font-medium text-base leading-relaxed">
        {currentQuestion.prompt}
      </p>

      {/* Answer section */}
      {currentQuestion.type === 'angle-target' ? (
        <AngleTargetSection
          question={currentQuestion}
          raoLao={raoLao}
          cranialCaudal={cranialCaudal}
          answered={state.answered}
          onCheck={handleAngleCheck}
        />
      ) : (
        <ChoiceSection
          question={currentQuestion}
          selectedOption={selectedOption}
          onSelect={setSelectedOption}
          answered={state.answered}
          onSubmit={handleChoiceSubmit}
        />
      )}

      {/* Feedback */}
      {state.answered && (
        <div className={`animate-pop p-3 rounded-lg border ${
          state.lastCorrect
            ? 'bg-ecg/10 border-ecg/30'
            : 'bg-alarm/10 border-alarm/30'
        }`}>
          <p className={`font-bold text-sm mb-1 ${
            state.lastCorrect ? 'text-ecg' : 'text-alarm'
          }`}>
            {state.lastCorrect ? 'Correct!' : 'Incorrect'}
          </p>
          <p className="text-ink-soft text-xs leading-relaxed">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Next / Reset */}
      {state.answered && (
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={handleNext}
            className="flex-1 px-3 py-2 bg-drape-deep text-white rounded-lg text-sm font-medium hover:bg-drape transition-colors"
          >
            Next Question
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-raised text-ink rounded-lg text-sm hover:bg-line transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

function ChoiceSection({
  question,
  selectedOption,
  onSelect,
  answered,
  onSubmit,
}: {
  question: QuizQuestion
  selectedOption: string | null
  onSelect: (v: string) => void
  answered: boolean
  onSubmit: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {question.options?.map(option => {
        const isSelected = selectedOption === option
        const isCorrect = option === question.answer
        let style = 'border-line text-ink hover:border-ink-faint'
        if (answered) {
          if (isCorrect) style = 'border-ecg text-ecg bg-ecg/10'
          else if (isSelected && !isCorrect) style = 'border-alarm text-alarm bg-alarm/10'
          else style = 'border-line text-ink-faint'
        } else if (isSelected) {
          style = 'border-drape text-white bg-drape/10'
        }

        return (
          <button
            key={option}
            onClick={() => !answered && onSelect(option)}
            disabled={answered}
            className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${style}`}
          >
            {option}
          </button>
        )
      })}

      {!answered && (
        <button
          onClick={onSubmit}
          disabled={!selectedOption}
          className="mt-2 px-3 py-2 bg-drape-deep text-white rounded-lg text-sm font-medium hover:bg-drape transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}
    </div>
  )
}

function AngleTargetSection({
  question,
  raoLao,
  cranialCaudal,
  answered,
  onCheck,
}: {
  question: QuizQuestion
  raoLao: number
  cranialCaudal: number
  answered: boolean
  onCheck: () => void
}) {
  if (!question.targetAngles) return null

  const { raoLao: targetRL, cranialCaudal: targetCC, tolerance } = question.targetAngles
  const primaryDiff = Math.abs(raoLao - targetRL)
  const secondaryDiff = Math.abs(cranialCaudal - targetCC)
  const withinRange = primaryDiff <= tolerance && secondaryDiff <= tolerance

  const formatAngle = (label: string, current: number, target: number, tol: number) => {
    const diff = Math.abs(current - target)
    const ok = diff <= tol
    return (
      <div className="flex items-center justify-between">
        <span className="text-ink-soft">{label}</span>
        <span className={ok ? 'text-ecg font-medium' : 'text-alarm'}>
          {Math.round(current)}° {ok ? '(in range)' : `(need ${Math.round(target)}° ±${tol}°)`}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 bg-raised/60 rounded-lg space-y-2 text-xs">
        {formatAngle('Oblique (RAO/LAO)', raoLao, targetRL, tolerance)}
        {formatAngle('Angulation (Cran/Caud)', cranialCaudal, targetCC, tolerance)}
      </div>

      {withinRange && !answered && (
        <div className="animate-pop text-center text-xs font-semibold text-ecg">
          Both axes within tolerance!
        </div>
      )}

      {!answered && (
        <button
          onClick={onCheck}
          className="px-3 py-2 bg-drape-deep text-white rounded-lg text-sm font-medium hover:bg-drape transition-colors"
        >
          Check Angles
        </button>
      )}
    </div>
  )
}
