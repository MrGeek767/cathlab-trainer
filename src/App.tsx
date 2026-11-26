import { useState, useMemo, useCallback, lazy, Suspense } from 'react'
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
import { AppFooter } from '@/components/layout/AppFooter'
import { useCineRun } from '@/hooks/useCineRun'
import { useInjectionLoop } from '@/hooks/useInjectionLoop'
import { usePractice } from '@/hooks/usePractice'
import { useDevicePush } from '@/hooks/useDevicePush'
import { useWorkingView } from '@/hooks/useWorkingView'
import { effectiveDominance } from '@/practice/app-rules'
import { PracticePanel } from '@/components/practice/PracticePanel'
import { injectionSideFor, labelsState, systemShown, vesselOpacity } from '@/utils/monitor-state'
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
  // The Cath lab: its session lives here so it survives tab switches. Its patient is
  // right dominant, it injects the left coronary, and it uses the fluoro image, where
  // the devices are drawn.
  const cathlab = appMode === 'cathlab'
  const practice = usePractice()
  const shownDominance = effectiveDominance(appMode, dominance)
  const allSegments = useArteryData(shownDominance)
  // In the Cath lab, dragging the monitor moves the device instead of the C-arm.
  const drag2D = useDragRotation({ adjustRaoLao, adjustCranialCaudal, enabled: !cathlab })
  useWorkingView(cathlab, animateTo)
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  // A challenge target shows only its own side, as a selective injection would.
  const highlightSide = useMemo(() => {
    const target = allSegments.find(s => s.id === highlightSegmentId)
    return target ? sideOf(target) : null
  }, [allSegments, highlightSegmentId])
  const { hoveredSegmentId, setHoveredSegmentId, selectedSegmentId, setSelectedSegmentId } = useHoveredSegment()
  const [injectionSide, setInjectionSide] = useState<InjectionSide>('left')
  const vesselTree = useMemo(() => buildVesselTree(allSegments), [allSegments])
  // Exams always use the real-fluoro image: no diagram, and arteries only with contrast.
  const [examActive, setExamActive] = useState(false)
  const examOn = appMode === 'challenges' && examActive
  const imageMode: ViewMode = examOn || cathlab ? 'fluoroscopy' : viewMode
  const imageLock = examOn ? 'Exams use real fluoro' : cathlab ? 'The practice uses the fluoro image' : null
  const realFluoroOn = imageMode === 'fluoroscopy' && (realFluoro || examOn)
  // In real fluoro a highlighted target can only be seen with contrast, so its own side
  // is injected again and again while the question is on screen; the learner's pick of
  // side is locked meanwhile and comes back afterwards.
  const loopInjections = realFluoroOn && appMode === 'challenges' && highlightSegmentId !== null
  const cineSide = injectionSideFor(cathlab ? 'left' : loopInjections ? highlightSide : null, injectionSide)
  const cine = useCineRun(vesselTree, cineSide)
  const devicePush = useDevicePush({
    enabled: cathlab,
    onMove: deltaMm => practice.dispatch({ type: 'move', deltaMm }),
    onInflate: () => practice.dispatch({ type: 'inflate' }),
    onInject: cine.play,
  })
  const monitorRef = useCallback(
    (el: HTMLDivElement | null) => {
      drag2D.containerRef.current = el
      devicePush.containerRef.current = el
    },
    [drag2D.containerRef, devicePush.containerRef],
  )
  // The final shot is a left coronary run; the panel then grades the result.
  const finalShot = () => {
    cine.play()
    practice.dispatch({ type: 'final-shot' })
  }
  const monitorOpacity = vesselOpacity(realFluoroOn, cine.opacity)
  useInjectionLoop(loopInjections, cine.playing, cine.play)
  // Names on the monitor; the Labels switch shows exactly what the monitor does. While a
  // target is highlighted, and for a whole exam, hover and selection are off everywhere
  // as well, so no name can leak.
  const labels = labelsState({
    learn: appMode === 'guided',
    question: highlightSegmentId !== null,
    exam: examOn,
    chosen: showLabels,
  })
  const quizLock = highlightSegmentId !== null || examOn
  // In the Cath lab the pointer works the device, so the monitor neither highlights nor picks segments.
  const monitorPickLock = quizLock || cathlab
  // The arteries filter belongs to Explore, and steps aside during a run; the other tabs
  // always show both coronaries.
  const systemFilter = systemShown(appMode === 'explore', coronarySystem, cine.playing)
  const segments = useMemo(() => {
    // The practice guide sits in the left main, so only the left coronary is shown.
    const side = highlightSide ?? (cathlab ? 'left' : systemFilter === 'both' ? null : systemFilter)
    return side ? allSegments.filter(s => sideOf(s) === side) : allSegments
  }, [allSegments, systemFilter, highlightSide, cathlab])

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
            injectionSide={cineSide}
            onInjectionSide={setInjectionSide}
            injectionSideLock={
              cathlab ? 'The practice injects the left coronary' : loopInjections ? 'This question injects its own coronary' : undefined
            }
            playing={cine.playing}
            onInject={cine.play}
            onStop={cine.stop}
            dominance={shownDominance}
            onDominance={setDominance}
            dominanceLock={cathlab ? 'The practice patient is right dominant' : undefined}
          />
        </aside>

        {/* Centre: the live monitor, as large as the window allows */}
        <section aria-label="Angiogram" className="order-first flex min-w-0 flex-col gap-2 lg:order-none lg:min-h-0">
          <MonitorToolbar
            viewMode={imageMode}
            onViewMode={setViewMode}
            realFluoro={realFluoro || examOn}
            onRealFluoro={setRealFluoro}
            imageLock={imageLock}
            realFluoroLocked={examOn}
            labels={labels.on}
            onLabels={setShowLabels}
            labelsLock={labels.lock}
            inverted={invertLut}
            onInverted={setInvertLut}
            heartbeat={heartbeat}
            onHeartbeat={setHeartbeat}
          />
          <div className="flex h-[min(94vw,72vh)] items-center justify-center [container-type:size] lg:h-auto lg:min-h-0 lg:flex-1">
            <div
              ref={monitorRef}
              tabIndex={cathlab ? 0 : undefined}
              role={cathlab ? 'group' : undefined}
              aria-label={cathlab ? 'Monitor' : undefined}
              aria-describedby={cathlab ? 'monitor-keys' : undefined}
              className="relative h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] cursor-grab overflow-hidden rounded-2xl bg-black shadow-[0_0_0_6px_#060D16,0_0_0_7px_#24405F] active:cursor-grabbing"
            >
              {cathlab && (
                <p id="monitor-keys" className="sr-only">
                  Drag right or up to push the device in, left or down to pull it back. The up and down arrow keys move it 1 mm, I inflates and
                  space injects contrast.
                </p>
              )}
              <Scene2D
                segments={segments}
                anatomy={allSegments}
                raoLao={angles.raoLao}
                cranialCaudal={angles.cranialCaudal}
                viewMode={imageMode}
                hoveredSegmentId={monitorPickLock ? null : hoveredSegmentId}
                onHoverSegment={monitorPickLock ? IGNORE : setHoveredSegmentId}
                onClickSegment={monitorPickLock ? IGNORE : setSelectedSegmentId}
                invertLut={invertLut}
                showLabels={labels.on}
                namesHidden={quizLock}
                opacity={monitorOpacity}
                highlightSegmentId={highlightSegmentId}
                acquiring={cine.playing}
                cineFrame={cine.frame}
                heartbeat={heartbeat}
                realFluoro={realFluoroOn}
                dominanceLabel={DOMINANCE_LABEL[shownDominance]}
                injectHint={realFluoroOn && !cine.playing && !loopInjections}
                catheterSide={cineSide}
                lumens={cathlab ? practice.lumens : undefined}
                devices={cathlab ? practice.devices : null}
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
            {cathlab && <PracticePanel state={practice.state} onAction={practice.dispatch} onFinalShot={finalShot} />}
          </div>
        </aside>
      </main>

      {/* The disclaimer, and the attribution the heart model's CC BY 4.0 licence requires */}
      <AppFooter />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
