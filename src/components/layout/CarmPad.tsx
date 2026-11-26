import type { ReactNode } from 'react'
import type { AngleState, DominanceType, PresetView } from '@/types/angles'
import type { InjectionSide } from '@/utils/contrast'
import { AngleSlider } from '@/components/controls/AngleSlider'
import { PresetButtons } from '@/components/controls/PresetButtons'
import { CineControls } from '@/components/controls/CineControls'
import { DominanceToggle } from '@/components/controls/DominanceToggle'

interface CarmPadProps {
  angles: AngleState
  onRaoLao: (value: number) => void
  onCranialCaudal: (value: number) => void
  onPreset: (preset: PresetView) => void
  /** Off in the challenges, where the view descriptions would give answers away. */
  showViewHints: boolean
  injectionSide: InjectionSide
  onInjectionSide: (side: InjectionSide) => void
  /** Set while a question picks the side, with the reason shown under the control. */
  injectionSideLock?: string
  playing: boolean
  onInject: () => void
  onStop: () => void
  dominance: DominanceType
  onDominance: (value: DominanceType) => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

/** Everything the operator's hands do: angles, standard views, contrast and anatomy. */
export function CarmPad(props: CarmPadProps) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="C-arm">
        <AngleSlider
          label="Rotation"
          min={-90}
          max={90}
          value={Math.round(props.angles.raoLao)}
          onChange={props.onRaoLao}
          leftLabel="RAO"
          rightLabel="LAO"
        />
        <AngleSlider
          label="Angulation"
          min={-45}
          max={45}
          value={Math.round(props.angles.cranialCaudal)}
          onChange={props.onCranialCaudal}
          leftLabel="Caudal"
          rightLabel="Cranial"
        />
      </Section>
      <Section title="Standard views">
        <PresetButtons currentAngles={props.angles} onSelectPreset={props.onPreset} showHints={props.showViewHints} />
      </Section>
      <Section title="Contrast">
        <CineControls
          side={props.injectionSide}
          onSideChange={props.onInjectionSide}
          sideLock={props.injectionSideLock}
          playing={props.playing}
          onPlay={props.onInject}
          onStop={props.onStop}
        />
      </Section>
      <Section title="Dominance">
        <DominanceToggle value={props.dominance} onChange={props.onDominance} />
      </Section>
    </div>
  )
}
