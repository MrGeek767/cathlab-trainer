import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BODY_LAYER, VESSEL_BEHIND_LAYER, VESSEL_LAYER } from './density'

/**
 * Turns the scene's X-ray densities into a fluoroscopy image. The scene renders into a
 * half-float buffer (each structure adds its density), then one full-screen pass:
 * - blurs slightly (focal spot and detector),
 * - adds the patient's soft tissue, thicker toward the edges of the field,
 * - converts to transmitted intensity (exp(-density)) through a display window,
 * - adds quantum mottle, new every frame at the pulse rate and stronger where fewer
 *   photons get through,
 * - darkens toward the rim, and optionally inverts (contrast shown white).
 */
const POST_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const POST_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D tBody;
  uniform sampler2D tVessels;
  uniform vec2 uTexel;
  uniform float uFrame;
  uniform float uNoise;
  uniform float uInvert;
  uniform float uGrain;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float density(vec2 uv) { return texture2D(tBody, uv).r + texture2D(tVessels, uv).r; }

  void main() {
    vec2 dx = vec2(uTexel.x, 0.0) * 1.25;
    vec2 dy = vec2(0.0, uTexel.y) * 1.25;
    float d = density(vUv) * 0.36
      + (density(vUv + dx) + density(vUv - dx) + density(vUv + dy) + density(vUv - dy)) * 0.12
      + (density(vUv + dx + dy) + density(vUv - dx + dy) + density(vUv + dx - dy) + density(vUv - dx - dy)) * 0.04;

    vec2 c = vUv - 0.5;
    float r2 = dot(c, c) * 4.0;
    float tissue = 0.45 + 0.2 * r2;
    float transmitted = exp(-(tissue + d));

    float grey = clamp((transmitted - 0.04) / (0.66 - 0.04), 0.0, 1.0);
    grey = pow(grey, 0.9);

    vec2 cell = floor(gl_FragCoord.xy / uGrain);
    float n = hash(cell + vec2(uFrame * 13.7, uFrame * 7.3)) + hash(cell * 1.31 + vec2(uFrame * 3.1, -uFrame * 5.9)) - 1.0;
    grey += n * uNoise * (0.55 + 0.45 * (1.0 - grey));

    grey *= 1.0 - 0.22 * r2 * r2;
    grey = clamp(grey, 0.0, 1.0);
    if (uInvert > 0.5) grey = 1.0 - grey;
    gl_FragColor = vec4(vec3(grey), 1.0);
  }
`

/** Mottle strength: fluoro is a low-dose, noisy picture; cine uses more dose and is cleaner. */
export const NOISE = { fluoro: 0.075, cine: 0.035 } as const

interface FluoroPipelineProps {
  invert: boolean
  /** Mottle strength, see NOISE. */
  noise: number
  /** Image frames per second: pulsed fluoro and cine both run at 15. */
  frameRate?: number
}

export function FluoroPipeline({ invert, noise, frameRate = 15 }: FluoroPipelineProps) {
  const { gl, size } = useThree()

  const targets = useMemo(() => {
    const make = (depthBuffer: boolean) =>
      new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        depthBuffer,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      })
    // The vessel buffer keeps depth: the front pass's nearest vessel decides crossings.
    return { body: make(false), vessels: make(true) }
  }, [])
  useEffect(
    () => () => {
      targets.body.dispose()
      targets.vessels.dispose()
    },
    [targets],
  )

  const dpr = gl.getPixelRatio()
  useEffect(() => {
    const width = Math.max(1, Math.round(size.width * dpr))
    const height = Math.max(1, Math.round(size.height * dpr))
    targets.body.setSize(width, height)
    targets.vessels.setSize(width, height)
  }, [targets, size.width, size.height, dpr])

  const post = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: POST_VERTEX,
      fragmentShader: POST_FRAGMENT,
      uniforms: {
        tBody: { value: targets.body.texture },
        tVessels: { value: targets.vessels.texture },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uFrame: { value: 0 },
        uNoise: { value: NOISE.fluoro },
        uInvert: { value: 0 },
        uGrain: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    const scene = new THREE.Scene()
    scene.add(quad)
    return { material, quad, scene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) }
  }, [targets])
  useEffect(
    () => () => {
      post.material.dispose()
      post.quad.geometry.dispose()
    },
    [post],
  )

  // Priority 1: runs after everything else has moved, and takes over rendering.
  useFrame(({ gl: renderer, scene, camera, clock }) => {
    const uniforms = post.material.uniforms
    uniforms.uTexel!.value.set(1 / targets.body.width, 1 / targets.body.height)
    uniforms.uFrame!.value = Math.floor(clock.elapsedTime * frameRate)
    uniforms.uNoise!.value = noise
    uniforms.uInvert!.value = invert ? 1 : 0
    uniforms.uGrain!.value = renderer.getPixelRatio()

    const background = scene.background
    scene.background = null
    renderer.setClearColor(0x000000, 1)
    for (const [layer, target] of [[BODY_LAYER, targets.body], [VESSEL_LAYER, targets.vessels]] as const) {
      camera.layers.set(layer)
      renderer.setRenderTarget(target)
      renderer.clear()
      renderer.render(scene, camera)
    }
    // Crossing vessels add on top, tested against the front pass's depth (no clear).
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    camera.layers.set(VESSEL_BEHIND_LAYER)
    renderer.render(scene, camera)
    renderer.autoClear = autoClear
    camera.layers.set(0)
    scene.background = background
    renderer.setRenderTarget(null)
    renderer.render(post.scene, post.camera)
  }, 1)

  return null
}
