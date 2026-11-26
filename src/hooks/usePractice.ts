import { useMemo, useReducer } from 'react'
import { useArteryData } from './useArteryData'
import { buildVesselPaths } from '@/utils/vessel-paths'
import { MM_TO_SCENE } from '@/utils/geometry'
import { PRACTICE_LESION, lumenAt } from '@/practice/lesion'
import { LAD_RAIL, buildRail } from '@/practice/rail'
import { initialPractice, practiceReducer, type PracticeAction, type PracticeContext, type PracticeState } from '@/practice/session'
import type { DeviceScene } from '@/practice/device-shapes'

/** The seated guide's tip sits this far into the left main. */
const GUIDE_TIP_MM = 2
/** The parked wire stops this short of the end of the LAD. */
const WIRE_SHORT_OF_END_MM = 20

/**
 * The Cath lab practice session, held for the life of the app so it survives tab
 * switches. It always uses the right-dominant anatomy, as drawn on the monitor, so a
 * dominance change elsewhere never resets it.
 */
export function usePractice(): {
  ctx: PracticeContext
  state: PracticeState
  dispatch: (action: PracticeAction) => void
  lumens: ReadonlyMap<string, (mm: number) => number>
  devices: DeviceScene
} {
  const anatomy = useArteryData('right')
  const ctx = useMemo<PracticeContext>(() => {
    const paths = buildVesselPaths(anatomy)
    const rail = buildRail(LAD_RAIL, paths)
    const segment = anatomy.find(s => s.id === PRACTICE_LESION.segmentId)!
    return {
      rail,
      segment,
      segmentLengthMm: paths.get(segment.id)!.getLength() / MM_TO_SCENE,
      lesion: PRACTICE_LESION,
      guideTipMm: GUIDE_TIP_MM,
      wireTipMm: rail.lengthMm - WIRE_SHORT_OF_END_MM,
      proximalRefMm: segment.startRadius * 2,
      distalRefMm: segment.endRadius * 2,
    }
  }, [anatomy])
  const reducer = useMemo(() => practiceReducer(ctx), [ctx])
  const [state, dispatch] = useReducer(reducer, ctx, initialPractice)

  const lumen = state.vessel.lumen
  const lumens = useMemo(
    () => new Map([[ctx.lesion.segmentId, (mm: number) => lumenAt(lumen, mm) / 2]]) as ReadonlyMap<string, (mm: number) => number>,
    [ctx, lumen],
  )

  const stent = state.vessel.stent
  const atm = state.inflation?.atm ?? null
  const devices = useMemo<DeviceScene>(() => {
    const segStart = ctx.rail.startOf(ctx.lesion.segmentId)
    let drawnStent: DeviceScene['stent'] = null
    if (stent) {
      // Drawn at its average expanded size along its length.
      const samples = lumen.diameters.filter((_, i) => i * lumen.stepMm >= stent.startMm && i * lumen.stepMm <= stent.endMm)
      const mean = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : stent.nominalDiameterMm
      drawnStent = { startRailMm: segStart + stent.startMm, endRailMm: segStart + stent.endMm, diameterMm: mean }
    }
    return {
      rail: ctx.rail,
      guideTipMm: ctx.guideTipMm,
      wireTipMm: ctx.wireTipMm,
      inHand: state.inHand,
      tipMm: state.tipMm,
      atm,
      stent: drawnStent,
    }
  }, [ctx, state.inHand, state.tipMm, atm, stent, lumen])

  return { ctx, state, dispatch, lumens, devices }
}
