import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { addAxisAttribute, addRadiusProfileAttribute, buildProfiledTubeGeometry } from '@/utils/geometry'
import type { Rail } from '@/practice/rail'
import { balloonDiameterShown, markerPositions, shoulderProfile, type DeviceScene } from '@/practice/device-shapes'
import { CONTRAST_ATTENUATION_PER_MM, VESSEL_BEHIND_LAYER, deviceMaterial } from './density'

/**
 * Attenuation of each device relative to contrast, per mm of path. Metal is far denser
 * than iodinated contrast: the wire reads as a fine dark line even at a fraction of a
 * millimetre, its coiled tip and the platinum markers darker still. A deployed stent's
 * thin struts show faintly. The balloon is filled with half contrast, half saline.
 */
const DENSITY = { wire: 6, wireTip: 10, marker: 9, shaft: 1.2, crimpedStent: 2.2, stent: 0.35, balloon: 0.5 } as const
/** Drawn radii (mm). The wire's real 0.18 mm would vanish on a 620 px monitor. */
const RADIUS = { wire: 0.3, marker: 0.45, shaft: 0.35, crimpedStent: 0.6 } as const
const WIRE_TIP_MM = 30
const MARKER_MM = 1

/** The part of a rail between two positions, as a curve. */
class RailSpan extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly rail: Rail,
    private readonly fromMm: number,
    private readonly toMm: number,
  ) {
    super()
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.rail.pointAt(this.fromMm + (this.toMm - this.fromMm) * t))
  }
}

/**
 * A tube along the rail drawn with the contrast density model, adding on top of the vessel
 * and of other devices (see deviceMaterial). Only on the behind layer, so never picked.
 */
function RailTube({
  rail,
  fromMm,
  toMm,
  radiusMm,
  density,
  shoulderMm = 0,
}: {
  rail: Rail
  fromMm: number
  toMm: number
  radiusMm: number
  density: number
  shoulderMm?: number
}) {
  const geometry = useMemo(() => {
    const lengthMm = toMm - fromMm
    if (lengthMm <= 0.05 || radiusMm <= 0) return null
    const rings = Math.max(4, Math.min(96, Math.round(lengthMm / 1.5)))
    const outline = shoulderMm > 0 ? shoulderProfile(lengthMm, shoulderMm) : () => 1
    const radiusAt = (t: number) => Math.max(radiusMm * outline(t), 0.02)
    const tube = buildProfiledTubeGeometry(new RailSpan(rail, fromMm, toMm), radiusAt, rings, 8)
    addRadiusProfileAttribute(tube, radiusAt, rings, 8)
    addAxisAttribute(tube, rings, 8)
    return tube
  }, [rail, fromMm, toMm, radiusMm, shoulderMm])
  const material = useMemo(() => deviceMaterial(), [])
  material.uniforms.uDensity!.value = CONTRAST_ATTENUATION_PER_MM * density
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  if (!geometry) return null
  return <mesh geometry={geometry} material={material} onUpdate={self => self.layers.set(VESSEL_BEHIND_LAYER)} />
}

/** The wire, the device in hand and a placed stent, as they look on fluoro (plan Task 9). */
export function PracticeDevices({ scene }: { scene: DeviceScene }) {
  const { rail, guideTipMm, wireTipMm, inHand, tipMm, atm, stent } = scene
  const tipStart = Math.max(guideTipMm, wireTipMm - WIRE_TIP_MM)
  return (
    <>
      {/* The wire: its body from the guide tip, then the denser coiled tip. */}
      <RailTube rail={rail} fromMm={guideTipMm} toMm={tipStart} radiusMm={RADIUS.wire} density={DENSITY.wire} />
      <RailTube rail={rail} fromMm={tipStart} toMm={wireTipMm} radiusMm={RADIUS.wire} density={DENSITY.wireTip} />
      {stent && (
        <RailTube rail={rail} fromMm={stent.startRailMm} toMm={stent.endRailMm} radiusMm={stent.diameterMm / 2} density={DENSITY.stent} />
      )}
      {inHand && <HeldDevice rail={rail} guideTipMm={guideTipMm} scene={scene} tipMm={tipMm} atm={atm} />}
    </>
  )
}

function HeldDevice({
  rail,
  guideTipMm,
  scene,
  tipMm,
  atm,
}: {
  rail: Rail
  guideTipMm: number
  scene: DeviceScene
  tipMm: number
  atm: number | null
}) {
  const device = scene.inHand!
  const [proximal, distal] = markerPositions(device, tipMm)
  const open = balloonDiameterShown(device, atm)
  return (
    <>
      <RailTube rail={rail} fromMm={guideTipMm} toMm={proximal} radiusMm={RADIUS.shaft} density={DENSITY.shaft} />
      {device.category === 'stent' && open === 0 && (
        <RailTube rail={rail} fromMm={proximal} toMm={distal} radiusMm={RADIUS.crimpedStent} density={DENSITY.crimpedStent} />
      )}
      {open > 0 && (
        <RailTube rail={rail} fromMm={proximal} toMm={distal} radiusMm={open / 2} density={DENSITY.balloon} shoulderMm={1.5} />
      )}
      {[proximal, distal].map(at => (
        <RailTube key={at === proximal ? 'p' : 'd'} rail={rail} fromMm={at - MARKER_MM / 2} toMm={at + MARKER_MM / 2} radiusMm={RADIUS.marker} density={DENSITY.marker} />
      ))}
    </>
  )
}
