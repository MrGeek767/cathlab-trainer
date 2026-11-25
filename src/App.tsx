import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { useAngleState } from '@/hooks/useAngleState'
import { useDragRotation } from '@/hooks/useDragRotation'
import { useArteryData } from '@/hooks/useArteryData'
import { useHoveredSegment } from '@/hooks/useHoveredSegment'
import { Scene3D } from '@/components/three-d/Scene3D'
import { Scene2D } from '@/components/two-d/Scene2D'
import { ChallengeShell } from '@/components/challenges/ChallengeShell'
import { AboutDialog } from '@/components/about/AboutDialog'
import { AppHeader } from '@/components/layout/AppHeader'
import { CarmPad } from '@/components/layout/CarmPad'
import { MonitorToolbar } from '@/components/layout/MonitorToolbar'
import { ExplorePanel } from '@/components/layout/ExplorePanel'
import { MODE_TABS, panelId } from '@/components/layout/ModeTabs'
import { DISCLAIMER } from '@/data/credits'
import { useCineRun } from '@/hooks/useCineRun'
import { useInjectionLoop } from '@/hooks/useInjectionLoop'
import { vesselOpacity } from '@/utils/monitor-state'
import { buildVesselTree, sideOf, type InjectionSide } from '@/utils/contrast'
import { prefersReducedMotion } from '@/utils/motion'
import type { DominanceType, ViewMode, AppMode, CoronarySystem, PresetView } from '@/types/angles'

const TeachingPanel = lazy(() => import('@/components/teaching/TeachingPanel').then(m => ({ default: m.TeachingPanel })))
const QuizPanel = lazy(() => import('@/components/teaching/QuizPanel').then(m => ({ default: m.QuizPanel })))

const IGNORE = () => {}

const DOMINANCE_LABEL: Record<DominanceType, string> = {
  right: 'Right dominant',
  left: 'Left dominant',
  codominant: 'Co-dominant',
}

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
  const [invertLut, setInvertLut] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [realFluoro, setRealFluoro] = useState(false)
  const [heartbeat, setHeartbeat] = useState(() => !prefersReducedMotion())
  const [coronarySystem, setCoronarySystem] = useState<CoronarySystem>('both')
  const allSegments = useArteryData(dominance)
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  // A challenge target shows only its own side, as a selective injection would.
  const highlightSide = useMemo(() => {
    const target = allSegments.find(s => s.id === highlightSegmentId)
    return target ? sideOf(target) : null
  }, [allSegments, highlightSegmentId])
  // The arteries filter belongs to Explore; the other tabs always show both coronaries.
  const systemFilter = appMode === 'explore' ? coronarySystem : 'both'
  const segments = useMemo(() => {
    const side = highlightSide ?? (systemFilter === 'both' ? null : systemFilter)
    return side ? allSegments.filter(s => sideOf(s) === side) : allSegments
  }, [allSegments, systemFilter, highlightSide])
  // While a target is highlighted, hover and selection are off everywhere so its name cannot leak.
  const quizLock = highlightSegmentId !== null
  const { hoveredSegmentId, setHoveredSegmentId, selectedSegmentId, setSelectedSegmentId } = useHoveredSegment()
  const [injectionSide, setInjectionSide] = useState<InjectionSide>('left')
  const vesselTree = useMemo(() => buildVesselTree(allSegments), [allSegments])
  const cine = useCineRun(vesselTree, injectionSide)

  // Exams always use the real-fluoro image: no diagram, and arteries only with contrast.
  const [examActive, setExamActive] = useState(false)
  const examOn = appMode === 'challenges' && examActive
  const imageMode: ViewMode = examOn ? 'fluoroscopy' : viewMode
  const realFluoroOn = imageMode === 'fluoroscopy' && (realFluoro || examOn)
  const monitorOpacity = vesselOpacity(realFluoroOn, cine.opacity)
  // In real fluoro a highlighted target can only be seen with contrast, so its side is
  // injected again and again while the question is on screen.
  const loopInjections = realFluoroOn && appMode === 'challenges' && highlightSegmentId !== null
  useEffect(() => {
    if (loopInjections && highlightSide) setInjectionSide(highlightSide)
  }, [loopInjections, highlightSide])
  useInjectionLoop(loopInjections, cine.playing, cine.play)

  const tabLabel = MODE_TABS.find(tab => tab.mode === appMode)?.label ?? ''

  return (
    <div className="flex min-h-screen flex-col bg-room text-ink lg:h-screen lg:overflow-hidden print:hidden">
      <AppHeader mode={appMode} onModeChange={setAppMode} onAbout={() => setAboutOpen(true)} />

      <main className="grid flex-1 grid-cols-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        {/* Left: the C-arm pad */}
        <aside aria-label="C-arm controls" className="rounded-xl bg-panel p-4 ring-1 ring-line lg:min-h-0 lg:overflow-y-auto">
          <CarmPad
            angles={angles}
            onRaoLao={setRaoLao}
            onCranialCaudal={setCranialCaudal}
            onPreset={handlePreset}
            showViewHints={appMode !== 'challenges'}
            injectionSide={injectionSide}
            onInjectionSide={setInjectionSide}
            playing={cine.playing}
            onInject={cine.play}
            onStop={cine.stop}
            dominance={dominance}
            onDominance={setDominance}
          />
        </aside>

        {/* Centre: the live monitor, as large as the window allows */}
        <section aria-label="Angiogram" className="order-first flex min-w-0 flex-col gap-2 lg:order-none lg:min-h-0">
          <MonitorToolbar
            viewMode={imageMode}
            onViewMode={setViewMode}
            realFluoro={realFluoro || examOn}
            onRealFluoro={setRealFluoro}
            realFluoroLocked={examOn}
            labels={showLabels}
            onLabels={setShowLabels}
            inverted={invertLut}
            onInverted={setInvertLut}
            heartbeat={heartbeat}
            onHeartbeat={setHeartbeat}
          />
          <div className="flex h-[min(94vw,72vh)] items-center justify-center [container-type:size] lg:h-auto lg:min-h-0 lg:flex-1">
            <div
              ref={drag2D.containerRef}
              className="relative h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] cursor-grab overflow-hidden rounded-2xl bg-black shadow-[0_0_0_6px_#060D16,0_0_0_7px_#24405F] active:cursor-grabbing"
            >
              <Scene2D
                segments={segments}
                anatomy={allSegments}
                raoLao={angles.raoLao}
                cranialCaudal={angles.cranialCaudal}
                viewMode={imageMode}
                hoveredSegmentId={hoveredSegmentId}
                onHoverSegment={setHoveredSegmentId}
                onClickSegment={setSelectedSegmentId}
                invertLut={invertLut}
                showLabels={appMode === 'guided' || showLabels}
                opacity={monitorOpacity}
                highlightSegmentId={highlightSegmentId}
                acquiring={cine.playing}
                cineFrame={cine.frame}
                heartbeat={heartbeat}
                realFluoro={realFluoroOn}
                dominanceLabel={DOMINANCE_LABEL[dominance]}
                injectHint={realFluoroOn && !cine.playing && !loopInjections}
                catheterSide={injectionSide}
              />
            </div>
          </div>
        </section>

        {/* Right: the 3D heart as a reference monitor, then the active tab */}
        <aside className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <div
            ref={drag3D.containerRef}
            className="relative h-56 shrink-0 cursor-grab overflow-hidden rounded-xl bg-panel ring-1 ring-line active:cursor-grabbing lg:h-[34%] lg:min-h-[170px]"
          >
            <span className="pointer-events-none absolute left-3 top-2 z-10 text-xs text-ink-faint">3D heart. Drag to turn.</span>
            <Scene3D
              segments={segments}
              anatomy={allSegments}
              heartbeat={heartbeat}
              hoveredSegmentId={quizLock ? null : hoveredSegmentId}
              selectedSegmentId={quizLock ? null : selectedSegmentId}
              onHoverSegment={quizLock ? IGNORE : setHoveredSegmentId}
              onClickSegment={quizLock ? IGNORE : setSelectedSegmentId}
              raoLao={angles.raoLao}
              cranialCaudal={angles.cranialCaudal}
            />
          </div>
          <div
            key={appMode}
            id={panelId(appMode)}
            role="tabpanel"
            aria-label={tabLabel}
            className="min-h-[24rem] flex-1 animate-panel-in overflow-hidden rounded-xl bg-panel ring-1 ring-line lg:min-h-0"
          >
            {appMode === 'explore' && (
              <div className="h-full overflow-y-auto p-4">
                <ExplorePanel
                  raoLao={angles.raoLao}
                  cranialCaudal={angles.cranialCaudal}
                  segments={segments}
                  system={coronarySystem}
                  onSystem={setCoronarySystem}
                  hoveredSegmentId={hoveredSegmentId}
                  selectedSegmentId={selectedSegmentId}
                  onHoverSegment={setHoveredSegmentId}
                  onPick={(rl, cc) => animateTo({ raoLao: rl, cranialCaudal: cc })}
                />
              </div>
            )}
            <Suspense fallback={null}>
              {appMode === 'guided' && <TeachingPanel raoLao={angles.raoLao} cranialCaudal={angles.cranialCaudal} />}
              {appMode === 'quiz' && <QuizPanel raoLao={angles.raoLao} cranialCaudal={angles.cranialCaudal} />}
            </Suspense>
            {appMode === 'challenges' && (
              <ChallengeShell
                segments={allSegments}
                angles={angles}
                animateTo={animateTo}
                onHighlightChange={setHighlightSegmentId}
                onExamChange={setExamActive}
                realFluoro={realFluoroOn}
              />
            )}
          </div>
        </aside>
      </main>

      {/* The disclaimer, and the attribution the heart model's CC BY 4.0 licence requires */}
      <footer className="shrink-0 px-4 pb-2 text-center text-xs text-ink-faint">
        <span className="text-ink-soft">{DISCLAIMER}</span> Heart model:{' '}
        <a href="https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-soft">&ldquo;Realistic Human Heart&rdquo;</a>{' '}
        by{' '}
        <a href="https://sketchfab.com/neshallads" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-soft">neshallads</a>,{' '}
        licensed{' '}
        <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-soft">CC BY 4.0</a>.
      </footer>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
