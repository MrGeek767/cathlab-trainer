import * as THREE from 'three'
import { MM_TO_SCENE } from '@/utils/geometry'

/**
 * X-ray density materials for the fluoro view. Every structure writes how much it
 * attenuates the beam into the red channel of a half-float buffer, and the
 * contributions add up along the beam (see FluoroPipeline for the display step).
 *
 * The amount at each pixel follows how squarely the surface faces the beam, so a
 * tube is densest along its centre line and fades to nothing at its edges, as the
 * path length through a cylinder does. Upright structures (the spine) measure that
 * in the horizontal plane, so tilting the C-arm does not thin them.
 */
const VERTEX = /* glsl */ `
  uniform float uHorizontal;
  varying float vFacing;
  varying float vWorldY;
  #ifdef USE_LUMEN
  attribute float aRadius;
  attribute vec3 aAxis;
  varying float vRadius;
  varying float vSinAxis;
  #endif
  #ifdef USE_HEART_WEIGHT
  // The heart's pose this frame, taken in part by each vertex (aHeartWeight 0..1).
  uniform mat4 uHeart;
  attribute float aHeartWeight;
  #endif
  void main() {
    vec3 local = position;
    #ifdef USE_HEART_WEIGHT
    local = mix(position, (uHeart * vec4(position, 1.0)).xyz, aHeartWeight);
    #endif
    vec4 world = modelMatrix * vec4(local, 1.0);
    vWorldY = world.y;
    if (uHorizontal > 0.5) {
      vec3 n = mat3(modelMatrix) * normal;
      vec3 towardCamera = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
      vFacing = abs(dot(normalize(n.xz + vec2(1e-6)), normalize(towardCamera.xz + vec2(1e-6))));
    } else {
      vFacing = abs(normalize(normalMatrix * normal).z);
    }
    vec4 view = viewMatrix * world;
    #ifdef USE_LUMEN
    vRadius = aRadius;
    vec3 axis = normalize(mat3(modelViewMatrix) * aAxis);
    vSinAxis = sqrt(max(1.0 - axis.z * axis.z, 0.0));
    #endif
    #ifdef BEHIND_OFFSET
    // Pulled toward the viewer so only surfaces well behind the front-most vessel pass
    // the depth test: a crossing vessel, not the neighbour sharing this lumen.
    view.z += BEHIND_OFFSET;
    #endif
    gl_Position = projectionMatrix * view;
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uDensity;
  uniform float uDiscs;
  varying float vFacing;
  varying float vWorldY;
  #ifdef USE_LUMEN
  varying float vRadius;
  varying float vSinAxis;
  #endif
  void main() {
    #ifdef USE_LUMEN
    // lumenChordMm(): the beam's path through a round, contrast-filled lumen.
    float profile = clamp(vFacing / max(vSinAxis, 1e-3), 0.0, 1.0);
    float d = uDensity * 2.0 * vRadius * profile / max(vSinAxis, MIN_SIN_AXIS);
    #else
    float d = uDensity * vFacing;
    #endif
    if (uDiscs > 0.0) {
      // Vertebral bodies with lighter disc spaces between them.
      float f = fract(vWorldY / uDiscs);
      d *= 0.7 + 0.3 * smoothstep(0.0, 0.14, f) * smoothstep(1.0, 0.86, f);
    }
    gl_FragColor = vec4(d, 0.0, 0.0, 1.0);
  }
`

/**
 * Below this sine between a vessel and the beam, the vessel counts as end-on: its real
 * length, not an endless tube, limits the path (about 2.9 diameters at most).
 */
export const MIN_SIN_AXIS = 0.35

/**
 * Path length (mm) of the beam through a contrast-filled vessel of radius `radiusMm`.
 * `facing` is how squarely the vessel wall faces the beam where the ray enters, and
 * `sinAxis` the sine of the angle between the vessel and the beam. Across the beam the
 * path is the chord of the circle (2r through the middle, nothing at the edge); as the
 * vessel turns toward the beam the path lengthens by 1 / sinAxis, which is why
 * foreshortened segments look denser. Mirrored in the vessel shader.
 */
export function lumenChordMm(radiusMm: number, facing: number, sinAxis: number): number {
  const profile = Math.min(Math.max(facing / Math.max(sinAxis, 1e-3), 0), 1)
  return (2 * radiusMm * profile) / Math.max(sinAxis, MIN_SIN_AXIS)
}

export interface DensityOptions {
  /** Density where the surface faces the beam squarely. */
  density: number
  /** Measure facing in the horizontal plane (upright structures such as the spine). */
  horizontal?: boolean
  /** max: overlapping parts keep the denser value instead of adding (the two domes). */
  blend?: 'add' | 'max'
  /** Both faces add up (closed soft-tissue shapes); front only for tubes. */
  doubleSided?: boolean
  /** Spacing of disc spaces in world units, for the spine. */
  discs?: number
}

export function densityMaterial({
  density,
  horizontal = false,
  blend = 'add',
  doubleSided = false,
  discs = 0,
}: DensityOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uDensity: { value: density },
      uHorizontal: { value: horizontal ? 1 : 0 },
      uDiscs: { value: discs },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    blending: THREE.CustomBlending,
    blendEquation: blend === 'max' ? THREE.MaxEquation : THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  })
}

/**
 * Render layers. The body (heart, bone, diaphragm) adds up along the beam. Vessels take
 * two passes into their own buffer: the front pass keeps only the nearest vessel at each
 * pixel (depth-tested), so where one continuous lumen is drawn as two overlapping tubes
 * (segment joints, branch origins) it is counted once; the behind pass then adds any
 * vessel lying well behind it, so crossing vessels darken where they overlap, as they do
 * on a real angiogram. The front pass also stays on layer 0 for pointer events.
 */
export const BODY_LAYER = 2
export const VESSEL_LAYER = 1
export const VESSEL_BEHIND_LAYER = 3

/** How far behind the front-most vessel another vessel must lie to count as a crossing. */
export const CROSSING_DEPTH_MM = 5

/**
 * Attenuation per millimetre of contrast-filled lumen along the beam. Calibrated so a
 * proximal vessel reads near black and a small distal branch a mid grey.
 */
export const CONTRAST_ATTENUATION_PER_MM = 0.3

/**
 * The material for contrast-filled vessels. Its `uDensity` uniform is the attenuation
 * per millimetre of lumen; the radius and direction come per vertex (`aRadius`, `aAxis`).
 */
export function lumenMaterial(pass: 'front' | 'behind', { heartWeighted = false } = {}): THREE.ShaderMaterial {
  const behind = pass === 'behind'
  return new THREE.ShaderMaterial({
    defines: {
      USE_LUMEN: '',
      MIN_SIN_AXIS: MIN_SIN_AXIS.toFixed(3),
      ...(behind ? { BEHIND_OFFSET: (CROSSING_DEPTH_MM * MM_TO_SCENE).toFixed(4) } : {}),
      // For the guide catheter: each vertex follows the heart by its aHeartWeight.
      ...(heartWeighted ? { USE_HEART_WEIGHT: '' } : {}),
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uDensity: { value: 0 },
      uHorizontal: { value: 0 },
      uDiscs: { value: 0 },
      uHeart: { value: new THREE.Matrix4() },
    },
    depthTest: true,
    depthWrite: !behind,
    depthFunc: behind ? THREE.GreaterDepth : THREE.LessEqualDepth,
    side: THREE.FrontSide,
    transparent: behind,
    blending: behind ? THREE.AdditiveBlending : THREE.NoBlending,
  })
}

/**
 * The data type for the density buffers. Half floats hold densities above 1 without
 * clipping; a graphics card that cannot draw into them gets 8-bit buffers instead, where
 * the densest vessels clip but the image still shows, rather than a blank monitor.
 */
export function densityTargetType(hasExtension: (name: string) => boolean): THREE.TextureDataType {
  return hasExtension('EXT_color_buffer_half_float') || hasExtension('EXT_color_buffer_float')
    ? THREE.HalfFloatType
    : THREE.UnsignedByteType
}
