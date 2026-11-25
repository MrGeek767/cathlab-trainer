import { useState, useMemo, lazy, Suspense } from 'react'
import { useAngleState } from '@/hooks/useAngleState'
import { useDragRotation } from '@/hooks/useDragRotation'
import { useArteryData } from '@/hooks/useArteryData'
import { useHoveredSegment } from '@/hooks/useHoveredSegment'
import { Scene3D } from '@/components/three-d/Scene3D'
import { Scene2D } from '@/components/two-d/Scene2D'
import { AngleSlider } from '@/components/controls/AngleSlider'
import { AngleDisplay } from '@/components/controls/AngleDisplay'
import { DominanceToggle } from '@/components/controls/DominanceToggle'
import { ViewModeToggle } from '@/components/controls/ViewModeToggle'
import { PresetButtons } from '@/components/controls/PresetButtons'
import { QualityPanel } from '@/components/quality/QualityPanel'
import { OptimalViewMap } from '@/components/quality/OptimalViewMap'
import { ChallengeShell } from '@/components/challenges/ChallengeShell'
import { CineControls } from '@/components/controls/CineControls'
import { useCineRun } from '@/hooks/useCineRun'
import { buildVesselTree, sideOf, type InjectionSide } from '@/utils/contrast'

const TeachingPanel = lazy(() => import('@/components/teaching/TeachingPanel').then(m => ({ default: m.TeachingPanel })))
const QuizPanel = lazy(() => import('@/components/teaching/QuizPanel').then(m => ({ default: m.QuizPanel })))
import type { DominanceType, ViewMode, AppMode, CoronarySystem, PresetView } from '@/types/angles'

const IGNORE = () => {}

export default function App() {
  const { angles, setRaoLao, setCranialCaudal, adjustRaoLao, adjustCranialCaudal, animateTo } = useAngleState()
  const drag3D = useDragRotation({ adjustRaoLao, adjustCranialCaudal })
  const drag2D = useDragRotation({ adjustRaoLao, adjustCranialCaudal })

  const handlePreset = (preset: PresetView) => {
    animateTo({ raoLao: preset.raoLao, cranialCaudal: preset.cranialCaudal })
  }
  const [dominance, setDominance] = useState<DominanceType>('right')
  const [viewMode, setViewMode] = useState<ViewMode>('fluoroscopy')
  const [appMode, setAppMode] = useState<AppMode>('explore')
  const [invertLut, setInvertLut] = useState(true)
  const [showLabels, setShowLabels] = useState(false)
  const [coronarySystem, setCoronarySystem] = useState<CoronarySystem>('both')
  const allSegments = useArteryData(dominance)
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(null)
  // A challenge target shows only its own side, as a selective injection would.
  const highlightSide = useMemo(() => {
    const target = allSegments.find(s => s.id === highlightSegmentId)
    return target ? sideOf(target) : null
  }, [allSegments, highlightSegmentId])
  const segments = useMemo(() => {
    const side = highlightSide ?? (coronarySystem === 'both' ? null : coronarySystem)
    return side ? allSegments.filter(s => sideOf(s) === side) : allSegments
  }, [allSegments, coronarySystem, highlightSide])
  // While a target is highlighted, hover and selection are off everywhere so its name cannot leak.
  const quizLock = highlightSegmentId !== null
  const { hoveredSegmentId, setHoveredSegmentId, selectedSegmentId, setSelectedSegmentId } = useHoveredSegment()
  const [injectionSide, setInjectionSide] = useState<InjectionSide>('left')
  const vesselTree = useMemo(() => buildVesselTree(allSegments), [allSegments])
  const cine = useCineRun(vesselTree, injectionSide)

  const hasSidePanel = appMode !== 'explore'

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-gray-950 text-white lg:overflow-hidden print:hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-indigo-400">II</span>views
          </h1>
          <span className="text-xs font-bold uppercase tracking-widest text-white bg-indigo-600 rounded-md px-2 py-0.5 shadow-sm">
            Beta
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            Coronary Angiography View Simulator
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {(['explore', 'guided', 'quiz', 'challenges'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setAppMode(mode)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all capitalize ${
                  appMode === mode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-600 hidden sm:block">
            {segments.length} segments | {dominance}-dominant
          </div>
        </div>
      </header>

      {/* Main panels */}
      <div className={`grid lg:flex-1 lg:min-h-0 ${
        hasSidePanel
          ? 'grid-cols-1 lg:grid-cols-[1fr_1fr_320px]'
          : 'grid-cols-1 lg:grid-cols-2'
      }`}>
        {/* 3D Panel */}
        <div ref={drag3D.containerRef} className="relative h-[30vh] lg:h-auto min-h-0 border-r border-gray-800/30">
          <div className="absolute top-2 left-2 z-10 text-[10px] text-gray-600 uppercase tracking-wider bg-gray-950/80 px-2 py-0.5 rounded">
            3D Model
          </div>
          <Scene3D
            segments={segments}
            hoveredSegmentId={quizLock ? null : hoveredSegmentId}
            selectedSegmentId={quizLock ? highlightSegmentId : selectedSegmentId}
            onHoverSegment={quizLock ? IGNORE : setHoveredSegmentId}
            onClickSegment={quizLock ? IGNORE : setSelectedSegmentId}
            raoLao={angles.raoLao}
            cranialCaudal={angles.cranialCaudal}

          />
        </div>

        {/* 2D Panel */}
        <div ref={drag2D.containerRef} className="relative h-[30vh] lg:h-auto min-h-0 flex items-center justify-center p-2">
          <div className="absolute top-2 left-2 z-10 text-[10px] text-gray-600 uppercase tracking-wider bg-gray-950/80 px-2 py-0.5 rounded">
            {viewMode === 'fluoroscopy' ? 'Fluoroscopy' : 'Schematic'}
          </div>
          {/* Labels toggle — fluoroscopy only */}
          {viewMode === 'fluoroscopy' && (
            <button
              onClick={() => setShowLabels(v => !v)}
              className={`absolute top-2 right-2 z-10 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded transition-all ${
                showLabels
                  ? 'bg-cyan-700/80 text-white'
                  : 'bg-gray-950/80 text-gray-600 hover:text-gray-400'
              }`}
            >
              Labels
            </button>
          )}
          <Scene2D
            segments={segments}
            raoLao={angles.raoLao}
            cranialCaudal={angles.cranialCaudal}
            viewMode={viewMode}
            hoveredSegmentId={hoveredSegmentId}
            onHoverSegment={setHoveredSegmentId}
            onClickSegment={setSelectedSegmentId}
            realism
            invertLut={invertLut}
            showLabels={appMode === 'guided' || showLabels}
            opacity={cine.opacity}
            highlightSegmentId={highlightSegmentId}
          />
        </div>

        {/* Teaching / Quiz Panel (lazy-loaded) */}
        <Suspense fallback={null}>
          {appMode === 'guided' && (
            <TeachingPanel
              raoLao={angles.raoLao}
              cranialCaudal={angles.cranialCaudal}
            />
          )}
          {appMode === 'quiz' && (
            <QuizPanel
              raoLao={angles.raoLao}
              cranialCaudal={angles.cranialCaudal}
            />
          )}
          {appMode === 'challenges' && (
            <ChallengeShell
              segments={allSegments}
              angles={angles}
              animateTo={animateTo}
              onHighlightChange={setHighlightSegmentId}
            />
          )}
        </Suspense>
      </div>

      {/* Control Bar */}
      <div className="shrink-0 border-t border-gray-800/50 bg-gray-900/50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          {/* Angle Display */}
          <AngleDisplay raoLao={angles.raoLao} cranialCaudal={angles.cranialCaudal} />

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AngleSlider
              label="Oblique"
              min={-90}
              max={90}
              value={Math.round(angles.raoLao)}
              onChange={setRaoLao}
              leftLabel="RAO"
              rightLabel="LAO"
            />
            <AngleSlider
              label="Angulation"
              min={-45}
              max={45}
              value={Math.round(angles.cranialCaudal)}
              onChange={setCranialCaudal}
              leftLabel="Caudal"
              rightLabel="Cranial"
            />
          </div>

          {/* Presets + Toggles */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <PresetButtons currentAngles={angles} onSelectPreset={handlePreset} />
            <div className="flex items-center gap-4">
              {/* Coronary system filter */}
              <div className="flex bg-gray-800 rounded-lg p-0.5">
                {(['both', 'left', 'right'] as const).map(sys => (
                  <button
                    key={sys}
                    onClick={() => setCoronarySystem(sys)}
                    className={`px-2 py-1 text-[10px] rounded-md transition-all uppercase tracking-wider ${
                      coronarySystem === sys
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {sys === 'both' ? 'All' : sys === 'left' ? 'LCA' : 'RCA'}
                  </button>
                ))}
              </div>
              <CineControls
                side={injectionSide}
                onSideChange={setInjectionSide}
                playing={cine.playing}
                onPlay={cine.play}
                onStop={cine.stop}
              />
              <DominanceToggle value={dominance} onChange={setDominance} />
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                invertLut={invertLut}
                onToggleInvert={() => setInvertLut(v => !v)}
              />
            </div>
          </div>

          {/* View Quality + Optimal-View map (hidden in challenges: it would show the answers) */}
          {appMode !== 'challenges' && (
          <div className="border-t border-gray-800/30 pt-2 flex flex-col lg:flex-row items-center justify-center gap-4 flex-wrap">
            <QualityPanel
              raoLao={angles.raoLao}
              cranialCaudal={angles.cranialCaudal}
              segments={segments}
              hoveredSegmentId={quizLock ? null : hoveredSegmentId}
              onHoverSegment={quizLock ? IGNORE : setHoveredSegmentId}
            />
            <OptimalViewMap
              segments={segments}
              segmentId={quizLock ? null : selectedSegmentId ?? hoveredSegmentId}
              raoLao={angles.raoLao}
              cranialCaudal={angles.cranialCaudal}
              onPick={(rl, cc) => animateTo({ raoLao: rl, cranialCaudal: cc })}
            />
          </div>
          )}

          {/* 3D heart model attribution — required by its CC BY 4.0 license */}
          <div className="text-center text-[9px] leading-relaxed text-gray-600">
            Heart model:{' '}
            <a href="https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">&ldquo;Realistic Human Heart&rdquo;</a>{' '}
            by{' '}
            <a href="https://sketchfab.com/neshallads" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">neshallads</a>,{' '}
            licensed{' '}
            <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">CC BY 4.0</a>
          </div>
        </div>
      </div>
    </div>
  )
}
