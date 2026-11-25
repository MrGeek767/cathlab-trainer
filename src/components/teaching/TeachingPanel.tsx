import { useMemo } from 'react'
import { findNearestPreset } from '@/data/presets'
import { VESSEL_COLORS } from '@/data/colors'

interface TeachingPanelProps {
  raoLao: number
  cranialCaudal: number
}

/** Short names, on the same validated artery colours as the monitor and the 3D heart. */
const SEGMENT_DISPLAY: Record<string, { name: string; color: string }> = {
  'lm': { name: 'LM', color: VESSEL_COLORS.LM },
  'prox-lad': { name: 'pLAD', color: VESSEL_COLORS.LAD },
  'mid-lad': { name: 'mLAD', color: VESSEL_COLORS.LAD },
  'dist-lad': { name: 'dLAD', color: VESSEL_COLORS.LAD },
  'd1': { name: 'D1', color: VESSEL_COLORS.D1 },
  'd2': { name: 'D2', color: VESSEL_COLORS.D2 },
  'sep1': { name: 'Sep', color: VESSEL_COLORS.SEP },
  'prox-lcx': { name: 'pLCx', color: VESSEL_COLORS.LCx },
  'dist-lcx': { name: 'dLCx', color: VESSEL_COLORS.LCx },
  'om1': { name: 'OM1', color: VESSEL_COLORS.OM1 },
  'om2': { name: 'OM2', color: VESSEL_COLORS.OM2 },
  'prox-rca': { name: 'pRCA', color: VESSEL_COLORS.RCA },
  'mid-rca': { name: 'mRCA', color: VESSEL_COLORS.RCA },
  'dist-rca': { name: 'dRCA', color: VESSEL_COLORS.RCA },
  'pda': { name: 'PDA', color: VESSEL_COLORS.PDA },
  'plv': { name: 'PLV', color: VESSEL_COLORS.PLV },
  'am': { name: 'AM', color: VESSEL_COLORS.AM },
}

export function TeachingPanel({ raoLao, cranialCaudal }: TeachingPanelProps) {
  const { preset, distance } = useMemo(
    () => findNearestPreset(raoLao, cranialCaudal),
    [raoLao, cranialCaudal],
  )

  const isCustom = distance > 15

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4 text-sm">
      {/* View name */}
      <div>
        <p className="text-xs text-drape mb-1">
          {isCustom ? 'Custom View' : 'Current Target'}
        </p>
        <h3 className="text-lg font-bold text-white">
          {isCustom ? 'Custom View' : preset.name}
        </h3>
        {!isCustom && (
          <p className="text-xs text-ink-faint mt-0.5">{preset.angleRange}</p>
        )}
      </div>

      {/* Objective */}
      <div>
        <h4 className="text-xs font-semibold text-drape mb-1">
          Objective
        </h4>
        <p className="text-ink">
          {isCustom
            ? 'Explore vessel overlap and elongation at a non-standard projection.'
            : preset.objective}
        </p>
      </div>

      {/* Clinical Notes */}
      <div>
        <h4 className="text-xs font-semibold text-drape mb-1">
          Clinical Notes
        </h4>
        <p className="text-ink-soft leading-relaxed">
          {isCustom
            ? 'This view is not a standard dictionary preset. Adjust angles to explore how vessel visualization changes.'
            : preset.clinicalNotes}
        </p>
      </div>

      {/* Expected Findings */}
      <div>
        <h4 className="text-xs font-semibold text-drape mb-1">
          Expected Findings
        </h4>
        <ul className="space-y-1.5">
          {(isCustom
            ? ['Adjust angles toward a standard preset for specific findings.']
            : preset.expectedFindings
          ).map((finding, i) => (
            <li key={i} className="flex items-start gap-2 text-ink">
              <span aria-hidden className="text-drape mt-0.5 shrink-0">&#x2022;</span>
              <span>{finding}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Target Segments */}
      {!isCustom && (
        <div>
          <h4 className="text-xs font-semibold text-drape mb-1">
            Best Segments
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {preset.targetSegments.map(segId => {
              const seg = SEGMENT_DISPLAY[segId]
              if (!seg) return null
              return (
                <span
                  key={segId}
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: seg.color + '20',
                    color: seg.color,
                    border: `1px solid ${seg.color}40`,
                  }}
                >
                  {seg.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Practice Prompt */}
      <div className="mt-auto pt-4 border-t border-line">
        <h4 className="text-sm font-bold text-drape mb-1">
          Practice prompt
        </h4>
        <p className="text-ink italic">
          {isCustom
            ? 'Adjust ±5° in both axes. Observe which segments overlap and which elongate.'
            : preset.practicePrompt}
        </p>
      </div>
    </div>
  )
}
