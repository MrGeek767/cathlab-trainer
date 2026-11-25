import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ANATOMY_SCALE } from '@/utils/geometry'
import { SPINE, DOMES, DOME_SEMI_X, DOME_SEMI_Z, DOME_DROP } from '@/utils/landmarks'

/**
 * Faint spine and diaphragm shadows behind the vessels in the fluoro view. They use
 * the shapes in utils/landmarks.ts (tested there) and sit in the same 3D scene as the
 * vessels, so they follow the C-arm exactly, smoothing included.
 *
 * The raw scene is drawn light-on-black and inverted for display, so denser means
 * lighter here, as it does for the vessels. Each surface fades out where the beam
 * grazes it, which gives the soft edges of a real fluoro image.
 */
export const FLUORO_BACKGROUND = '#0a0a0a'
const BACKGROUND_LEVEL = parseInt(FLUORO_BACKGROUND.slice(1, 3), 16) / 255

/** Depth of the abdomen below each dome, and the curve that turns the dome's edge downward (unit-dome sizes). */
const SKIRT_DEPTH = 20
const ROLL = 0.15

const VERTEX_SHADER = /* glsl */ `
  uniform float uHorizontal;
  varying float vFacing;
  void main() {
    if (uHorizontal > 0.5) {
      // Upright surfaces (the spine): compare directions in the horizontal plane, so the
      // band keeps the same profile when the C-arm tilts cranial or caudal.
      vec3 worldNormal = mat3(modelMatrix) * normal;
      vec3 towardCamera = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
      vFacing = abs(dot(normalize(worldNormal.xz), normalize(towardCamera.xz)));
    } else {
      vFacing = abs(normalize(normalMatrix * normal).z);
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uPeak;
  uniform float uBase;
  uniform float uMaxBlend;
  varying float vFacing;
  void main() {
    float density = uPeak * vFacing;
    // Max-blended surfaces write a grey level, so overlaps keep the denser one instead of adding up.
    gl_FragColor = uMaxBlend > 0.5 ? vec4(vec3(uBase + density), 1.0) : vec4(vec3(1.0), density);
  }
`

function shadowMaterial(peak: number, kind: 'spine' | 'dome'): THREE.ShaderMaterialParameters {
  const isDome = kind === 'dome'
  return {
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uPeak: { value: peak },
      uBase: { value: BACKGROUND_LEVEL },
      uMaxBlend: { value: isDome ? 1 : 0 },
      uHorizontal: { value: isDome ? 0 : 1 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    ...(isDome ? { blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation } : {}),
  }
}

/** Spine: alpha per layer (near and far halves both draw). Domes: grey level above the background. */
const SPINE_SHADOW = shadowMaterial(0.07, 'spine')
const DOME_SHADOW = shadowMaterial(0.12, 'dome')

/** Unit dome profile: the paraboloid cap, a short curve that turns its edge straight down, then the skirt. */
function domeProfile(): THREE.Vector2[] {
  const cap = [0, 0.25, 0.5, 0.75, 1].map(r => new THREE.Vector2(r, -DOME_DROP * r * r))
  const rimSlope = 2 * DOME_DROP
  const roll = new THREE.QuadraticBezierCurve(
    new THREE.Vector2(1, -DOME_DROP),
    new THREE.Vector2(1 + ROLL, -DOME_DROP - rimSlope * ROLL),
    new THREE.Vector2(1 + ROLL, -DOME_DROP - 2 * rimSlope * ROLL),
  )
    .getPoints(6)
    .slice(1)
  return [...cap, ...roll, new THREE.Vector2(1 + ROLL, -DOME_DROP - SKIRT_DEPTH)]
}

export function Landmarks3D() {
  const domeGeometry = useMemo(() => new THREE.LatheGeometry(domeProfile(), 48), [])
  useEffect(() => () => domeGeometry.dispose(), [domeGeometry])

  const spineRadius = (SPINE.width / 2) * ANATOMY_SCALE
  const spineHeight = (SPINE.yTop - SPINE.yBottom) * ANATOMY_SCALE
  const spineY = ((SPINE.yTop + SPINE.yBottom) / 2) * ANATOMY_SCALE

  return (
    <group>
      {/* Domes first (max-blended), then the spine on top so it still shows below the diaphragm. */}
      {DOMES.map(dome => (
        <mesh
          key={dome.side}
          geometry={domeGeometry}
          position={[dome.apex[0] * ANATOMY_SCALE, dome.apex[1] * ANATOMY_SCALE, dome.apex[2] * ANATOMY_SCALE]}
          scale={[DOME_SEMI_X * ANATOMY_SCALE, ANATOMY_SCALE, DOME_SEMI_Z * ANATOMY_SCALE]}
          renderOrder={-2}
        >
          <shaderMaterial args={[DOME_SHADOW]} />
        </mesh>
      ))}
      <mesh position={[SPINE.x * ANATOMY_SCALE, spineY, SPINE.z * ANATOMY_SCALE]} renderOrder={-1}>
        <cylinderGeometry args={[spineRadius, spineRadius, spineHeight, 48, 1, true]} />
        <shaderMaterial args={[SPINE_SHADOW]} />
      </mesh>
    </group>
  )
}
