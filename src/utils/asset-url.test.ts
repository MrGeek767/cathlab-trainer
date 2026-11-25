import { describe, it, expect } from 'vitest'
import { assetUrl } from './asset-url'

describe('assetUrl', () => {
  it('prefixes the Pages base', () =>
    expect(assetUrl('models/heart/scene.gltf', '/cathlab-trainer/')).toBe('/cathlab-trainer/models/heart/scene.gltf'))
  it('tolerates a leading slash on the path', () =>
    expect(assetUrl('/models/heart/scene.gltf', '/cathlab-trainer/')).toBe('/cathlab-trainer/models/heart/scene.gltf'))
  it('tolerates a base without a trailing slash', () =>
    expect(assetUrl('favicon.svg', '/cathlab-trainer')).toBe('/cathlab-trainer/favicon.svg'))
  it('works at the root base', () =>
    expect(assetUrl('models/x.gltf', '/')).toBe('/models/x.gltf'))
})
