import { describe, it, expect } from 'vitest'
import { findExternalLoads } from './check-no-external.mjs'

describe('findExternalLoads', () => {
  it('flags stylesheet links to other hosts', () =>
    expect(findExternalLoads('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">', [])).toHaveLength(1))
  it('flags external scripts', () =>
    expect(findExternalLoads('<script src="https://cdn.example.com/x.js"></script>', [])).toHaveLength(1))
  it('flags url() and @import in CSS', () =>
    expect(findExternalLoads('', ['a{background:url("https://x.org/a.png")}', '@import "https://x.org/b.css";'])).toHaveLength(2))
  it('ignores ordinary <a href> links (credits)', () =>
    expect(findExternalLoads('<a href="https://sketchfab.com/neshallads">x</a>', [])).toHaveLength(0))
  it('ignores local assets', () =>
    expect(findExternalLoads(
      '<link rel="icon" href="/cathlab-trainer/favicon.svg"><script type="module" src="/cathlab-trainer/assets/index.js"></script>',
      ['a{src:url(/cathlab-trainer/assets/inter.woff2)}'],
    )).toHaveLength(0))
})
