# CathLab Trainer: Phase 0 + Phase 1 (Angle Trainer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a free, public, offline-safe CathLab Trainer built on iiviewer, with calibrated anatomy, contrast cine runs, orientation landmarks, and two scored challenges ("Show me" and "Name the segment") in Learner and Exam modes.

**Architecture:** Keep iiviewer's React + react-three-fiber app as the base. New logic goes into small, pure, unit-tested modules (segment sizes, contrast, polyline, landmarks, challenges, session, safe storage, credits), and thin UI components call them. GitHub Actions runs the tests, type-check, build and an offline check, then deploys to GitHub Pages.

**Tech Stack:** React 19, TypeScript ~5.7 (strict), three 0.170, @react-three/fiber 9, @react-three/drei 10, Vite 6, Tailwind 3, Vitest 2, @fontsource/inter 5, GitHub Actions (Node 22), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-25-cathlab-trainer-design.md` (copy of the Project doc "CathLab Game: Design v1.1", added in Task 1).

**Out of scope here (later plans):** device engine, cases, answer-key spreadsheet and scoring, nurse/tech tasks, lesions, heart motion, Read the Film, room view, pilot.

## Global Constraints

- Zero cost: free tools and services only.
- Repository `MrGeek767/cathlab-trainer`, public. Site `https://mrgeek767.github.io/cathlab-trainer/`. CI builds use Vite base `/cathlab-trainer/`.
- No runtime request to any host other than the site itself: no Google Fonts, no CDN, no Draco decoder, no HDRI downloads.
- Keep iiviewer's stack and dependency versions as imported; Node 22 in CI.
- Angles: `raoLao` −90…+90 (positive = LAO), `cranialCaudal` −45…+45 (positive = cranial). DICOM convention, unchanged.
- Patient frame: x = patient's left, y = cranial, z = anterior, in iiviewer anatomy units; **1 anatomy unit = 18 mm** (`ANATOMY_UNIT_MM`). Vessel radii are in mm.
- View ratings shown to learners come from the curated Di Mario matrix (`interpolateSegmentScore`). Geometry is used only for foreshortening and overlap readouts.
- Copy: working name "CathLab Trainer"; "Educational simulation, not for clinical use." visible on every screen; English only; no drug doses anywhere.
- Credits: iiviewer code by annasrahman.com, "used and modified with the author's permission"; heart model "Realistic Human Heart" by neshallads, CC BY 4.0.
- Segment numbering: SYNTAX (syntaxscore.org, Appendix I).
- Desktop Chrome or Edge with a mouse.

## Review Focus

1. **The hospital network blocks outside sites.** The app must load and run from the Pages host alone. (Task 2: offline check test, Draco off. Task 11: network log.)
2. **The site is served from `/cathlab-trainer/`.** The heart model, favicon and fonts must still load, with no blank 3D panel. (Task 2: `assetUrl` tests. Task 11.)
3. **Browser storage is blocked or full** (locked-down PCs, private windows). Challenges must still run; progress just isn't saved. (Task 9: storage tests.)
4. **Dominance or injection side changes during a cine run.** No stale or missing vessels, no crash. (Task 4: tree-per-variant test. Task 5: hook reset step.)
5. **Extreme C-arm angles** (±90 with ±45). Every projected landmark and every score must be a finite number. (Task 6 and Task 7 tests.)

---

### Task 1: Repository with iiviewer imported and a green baseline

**Files:**
- Create on GitHub: `MrGeek767/cathlab-trainer` (public; description "Free browser game for cath lab nurses and techs: angiographic views, devices and PCI cases. Educational simulation, not for clinical use.")
- Import: every file from the uploaded `iiviewer-main` (not `node_modules`, not `dist`) at the repository root
- Create: `LICENSE.md`, `CREDITS.md`, `docs/superpowers/specs/2026-11-25-cathlab-trainer-design.md`, `docs/superpowers/plans/2026-11-25-phase-0-1-angle-trainer.md`
- Modify: `package.json` (`"name": "cathlab-trainer"`), `README.md`

**Interfaces:**
- Produces: iiviewer's layout (`src/components`, `src/data`, `src/hooks`, `src/types`, `src/utils`, `public/models/heart`) that every later task edits.

- [ ] **Step 1:** Create the repository with the GitHub connector (`create_repository`: name `cathlab-trainer`, private false, autoInit false). Attach it with `add_repo` (owner `MrGeek767`, repo `cathlab-trainer`, access `push`) and clone it to `/home/claude/cathlab-trainer`.
- [ ] **Step 2:** Copy the iiviewer files in. Commit: `chore: import iiviewer as the base (used and modified with the author's permission)`.
- [ ] **Step 3:** Run `npm ci && npm test && npm run typecheck && npm run build`.
  Expected: every existing test in `src/utils/view-quality.test.ts` passes, `tsc` exits 0, and `dist/` is written.
- [ ] **Step 4:** Write `LICENSE.md` in three sections:
  1. Code that came from iiviewer remains its author's (annasrahman.com) and is used and modified with permission.
  2. New code: MIT License, "Copyright (c) 2026 the CathLab Trainer contributors".
  3. Written teaching content (case files, answer keys, feedback text): CC BY 4.0.

  Write `CREDITS.md` with the two credits from Global Constraints. Rewrite `README.md` to say what the game is and include the live link, the disclaimer, credits, and the `npm` commands.
- [ ] **Step 5:** Add the spec and this plan under `docs/superpowers/`. Commit: `docs: add design v1.1, phase 0-1 plan, licence and credits`. Push to `main`.

### Task 2: Offline-safe build, published to GitHub Pages

**Files:**
- Create: `src/utils/asset-url.ts`, `src/utils/asset-url.test.ts`, `scripts/check-no-external.mjs`, `scripts/check-no-external.test.mjs`, `.github/workflows/deploy.yml`
- Modify:
  - `index.html`: delete the three Google Fonts tags and the `scene.gltf` preload tag; set the favicon to `href="favicon.svg"`
  - `src/main.tsx`: import `@fontsource/inter/400.css`, `500.css`, `600.css`, `700.css`
  - `src/components/three-d/HeartGLTF.tsx:22,116`: `useGLTF(assetUrl('models/heart/scene.gltf'), false)` and the same in `useGLTF.preload`
  - `vite.config.ts`: `base: process.env.BASE_PATH ?? '/'`
  - `vitest.config.ts`: add `'scripts/**/*.test.mjs'` to `include`
  - `package.json`: dependency `"@fontsource/inter": "^5.1.0"`; script `"check:offline": "node scripts/check-no-external.mjs dist"`

**Interfaces:**
- Produces: `assetUrl(path: string, base?: string): string`, where `base` defaults to `import.meta.env.BASE_URL`.
- Produces: `findExternalLoads(html: string, cssFiles: string[]): string[]`, exported from `scripts/check-no-external.mjs`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/asset-url.test.ts
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
```

```js
// scripts/check-no-external.test.mjs
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
```

- [ ] **Step 2:** Run `npx vitest run src/utils/asset-url.test.ts scripts/check-no-external.test.mjs`.
  Expected: FAIL (modules not found).
- [ ] **Step 3: Implement both functions.**
  - `assetUrl` strips a leading `/` from `path` and makes sure `base` ends with `/`.
  - `findExternalLoads` returns every match of these patterns: `<link\b[^>]*\bhref=["']https?:\/\/[^"']+`, `<script\b[^>]*\bsrc=["']https?:\/\/[^"']+`, `url\(\s*["']?https?:\/\/[^)"']+`, `@import\s+(url\()?\s*["']?https?:\/\/[^"')]+`.
  - The CLI reads `<dir>/index.html` and every `<dir>/assets/*.css`, prints any matches and exits 1; otherwise it prints `No external loads` and exits 0.
  - The CLI only runs when the file is executed directly (compare `import.meta.url` with `pathToFileURL(process.argv[1]).href`), so importing it in tests doesn't trigger it.
- [ ] **Step 4:** Run the same two test files. Expected: PASS.
- [ ] **Step 5:** Make the `index.html`, `main.tsx`, `HeartGLTF.tsx`, `vite.config.ts` and `package.json` edits, then run `npm install`. Then run `BASE_PATH=/cathlab-trainer/ npm run build && npm run check:offline`.
  Expected: `No external loads`. `npm test` and `npm run typecheck` still pass.
- [ ] **Step 6: Write `.github/workflows/deploy.yml`.**
  - Triggers: `push` to `main`, and `workflow_dispatch`.
  - Permissions: `contents: read`, `pages: write`, `id-token: write`. Concurrency group `pages`, `cancel-in-progress: false`.
  - Job `build` (ubuntu-latest), in order:
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` (node 22, npm cache)
    3. `npm ci`
    4. `npm test`
    5. `npm run typecheck`
    6. `npm run build` with env `BASE_PATH: /cathlab-trainer/`
    7. `npm run check:offline`
    8. `actions/configure-pages@v5`
    9. `actions/upload-pages-artifact@v3` (path `dist`)
  - Job `deploy`: needs `build`; environment `github-pages`; runs `actions/deploy-pages@v4`.
- [ ] **Step 7:** Commit: `build: offline-safe fonts and assets, Pages base path, deploy workflow`. Push.
- [ ] **Step 8:** Omar, or Claude in Omar's browser with his OK: repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. Then re-run the workflow.
  Expected: the deploy job is green, and `https://mrgeek767.github.io/cathlab-trainer/` shows the app with the 3D heart.

### Task 3: Calibrated vessel sizes, real-world scale and SYNTAX numbers

**Files:**
- Create: `src/data/segment-sizes.ts`, `src/data/segment-sizes.test.ts`
- Modify:
  - `src/types/anatomy.ts`: add `syntaxSegment?: string | null` to `ArterySegment`
  - `src/hooks/useArteryData.ts`: return `applyAnatomy(variantSegments, dominance)`

**Interfaces:**
- Consumes: `ArterySegment`, `DominanceType`, `RIGHT_DOMINANT_SEGMENTS`, `LEFT_DOMINANT_SEGMENTS`, `CODOMINANT_SEGMENTS`, `buildArterySpline`, `ANATOMY_SCALE`.
- Produces:
  - `ANATOMY_UNIT_MM = 18`
  - `SEGMENT_DIAMETERS_MM: Record<DominanceType, Record<string, readonly [number, number]>>` (start, end)
  - `SYNTAX_SEGMENT: Record<DominanceType, Record<string, string | null>>`
  - `applyAnatomy(segments: ArterySegment[], dominance: DominanceType): ArterySegment[]`. Returns copies with `startRadius = start / 2`, `endRadius = end / 2` and `syntaxSegment` set. Throws `Error(\`No size for segment ${id} (${dominance})\`)` for an id missing from the table.
  - `segmentLengthMm(segment: ArterySegment): number`, computed as `buildArterySpline(cp).getLength() / ANATOMY_SCALE * ANATOMY_UNIT_MM`.

**Values (diameter in mm, start → end), right-dominant:**

| id | Ø | SYNTAX | | id | Ø | SYNTAX |
|---|---|---|---|---|---|---|
| lm | 4.2 → 4.2 | 5 | | prox-lcx | 3.0 → 2.9 | 11 |
| prox-lad | 3.2 → 3.1 | 6 | | om1 | 2.1 → 1.4 | 12a |
| mid-lad | 2.8 → 2.2 | 7 | | om2 | 1.8 → 1.2 | 12b |
| dist-lad | 2.2 → 1.2 | 8 | | dist-lcx | 2.2 → 1.4 | 13 |
| d1 | 1.8 → 1.2 | 9 | | prox-rca | 3.2 → 3.1 | 1 |
| d2 | 1.5 → 1.0 | 10 | | mid-rca | 3.1 → 2.9 | 2 |
| sep1 | 1.0 → 0.6 | null | | dist-rca | 2.9 → 2.6 | 3 |
| am | 1.4 → 1.0 | null | | pda | 2.0 → 1.2 | 4 |
| | | | | plv | 1.8 → 1.0 | 16 |

- **Left-dominant overrides** (others as right-dominant): lm 4.4 → 4.4; prox-rca 2.3 → 2.2; mid-rca 2.2 → 2.0; dist-rca 2.0 → 1.4; prox-lcx 3.4 → 3.3; dist-lcx 3.0 → 2.6; pda 2.0 → 1.2 (SYNTAX 15); plv 1.8 → 1.0 (SYNTAX 14).
- **Codominant overrides:** lm 4.3 → 4.3; prox-lcx 3.2 → 3.1; dist-lcx 2.6 → 2.0; prox-rca 3.0 → 2.9; mid-rca 2.9 → 2.7; dist-rca 2.7 → 2.2; pda 2.0 → 1.2 (SYNTAX 4); plv 1.8 → 1.0 (SYNTAX 14).
- **Source comment at the top of `segment-sizes.ts`:**
  - proximal means from QCA in 933 normal patients (Indian Heart J 2021, doi:10.1016/j.ihj.2021.04.001)
  - branch splits from Finet's law, pMV = 0.678 × (dMV + SB)
  - smaller RCA and larger LCx in left dominance per Dodge 1992 (Circulation)
  - d2, om2, am, sep1 and the distal end sizes are assumptions for the reviewers to confirm
  - SYNTAX numbers per syntaxscore.org, Appendix I

- [ ] **Step 1: Write the failing tests** in `src/data/segment-sizes.test.ts`:

```ts
describe('segment sizes', () => {
  it('every segment in every variant has a size and a SYNTAX entry', ...)
  // for each variant array: SEGMENT_DIAMETERS_MM[dom][s.id] defined; s.id in SYNTAX_SEGMENT[dom]

  it('proximal sizes sit within ±1 SD of the published QCA means (right-dominant start diameters)', ...)
  // lm 4.16±0.70, prox-lad 3.22±0.60, prox-lcx 3.02±0.62, prox-rca 3.05±0.65, d1 1.76±0.44, om1 2.10±0.50

  it('bifurcations obey Finet within 5% (right-dominant)', ...)
  // lm.end ≈ 0.678*(prox-lad.start + prox-lcx.start); prox-lad.end ≈ 0.678*(mid-lad.start + d1.start)
  // prox-lcx.end ≈ 0.678*(dist-lcx.start + om1.start); dist-rca.end ≈ 0.678*(pda.start + plv.start)

  it('vessels never widen downstream', ...)
  // every variant: child.start <= parent.start; for ids in
  // ['prox-lad','prox-lcx','mid-lad','dist-lad','dist-lcx','mid-rca','dist-rca','pda','plv']: child.start <= parent.end

  it('left dominance: smaller RCA, larger LCx than right dominance', ...)
  // left prox-rca.start < right prox-rca.start; left prox-lcx.start > right prox-lcx.start

  it('SYNTAX numbers follow dominance', ...)
  // right pda '4', plv '16'; left pda '15', plv '14'; codominant pda '4', plv '14'
  // sep1 and am null; om1 '12a'; om2 '12b'; lm '5'

  it('applyAnatomy sets radii to half the diameters and throws on unknown ids', ...)
  // applyAnatomy(RIGHT_DOMINANT_SEGMENTS,'right') lm.startRadius === 2.1
  // applyAnatomy([{...lm, id:'xyz'}],'right') throws /No size for segment xyz/

  it('real-world lengths are adult-sized (right-dominant)', ...)
  // LAD (prox+mid+dist) 90–130 mm; RCA to crux (prox+mid+dist) 100–150 mm; LM 5–20 mm
})
```

- [ ] **Step 2:** Run `npx vitest run src/data/segment-sizes.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `segment-sizes.ts` with the table above. Change `useArteryData` and add `syntaxSegment` to the type.
- [ ] **Step 4:** Run `npm test`. Expected: the new tests pass and all `view-quality` tests still pass.
- [ ] **Step 5:** Commit: `feat(anatomy): calibrated vessel sizes, real-world scale, SYNTAX numbers`.

### Task 4: Contrast injection model

**Files:**
- Create: `src/utils/contrast.ts`, `src/utils/contrast.test.ts`

**Interfaces:**
- Consumes: `ArterySegment`, `buildArterySpline`, `ANATOMY_SCALE`, `ANATOMY_UNIT_MM` and `segmentLengthMm` (Task 3).
- Produces:
  - `type InjectionSide = 'left' | 'right'`
  - `sideOf(segment: ArterySegment): InjectionSide` (territory `RCA` → `'right'`, otherwise `'left'`)
  - `interface VesselNode { id: string; parentId: string | null; side: InjectionSide; lengthMm: number; startDistanceMm: number }`
  - `interface VesselTree { nodes: Map<string, VesselNode>; maxPathMm: Record<InjectionSide, number> }`
  - `buildVesselTree(segments: ArterySegment[]): VesselTree`
  - `interface OpaqueRange { from: number; to: number }` (fractions of a segment's length; empty when `to - from <= 0`)
  - `interface CineTiming { fillMs: number; holdMs: number; washoutMs: number }`
  - `DEFAULT_CINE_TIMING: CineTiming = { fillMs: 900, holdMs: 2000, washoutMs: 1100 }`
  - `cineDurationMs(timing?: CineTiming): number`
  - `opacificationAt(tree: VesselTree, side: InjectionSide, tMs: number, timing?: CineTiming): Map<string, OpaqueRange>`, with an entry for every node in the tree

**Algorithm (not fixed by the signatures):**

```text
buildVesselTree:
  process segments parent-first (topological order on parentId; variant arrays are not ordered)
  lengthMm = segmentLengthMm(segment)
  root: startDistanceMm = 0
  child: sample the parent's curve at 100 points with cumulative arc length; take the sample
         nearest to the child's first control point (× ANATOMY_SCALE);
         startDistanceMm = parent.startDistanceMm + that cumulative length in mm
         (side branches leave mid-segment: d2, sep1, am, om2)
  maxPathMm[side] = max(startDistanceMm + lengthMm) over that side's nodes

opacificationAt (F = fillMs, H = holdMs, W = washoutMs, P = maxPathMm[side]):
  other-side nodes, t < 0 or t > F+H+W  → {from: 0, to: 0}
  0 ≤ t ≤ F        : front = P * t / F;          to = clamp((front - start) / len, 0, 1); from = 0
  F < t ≤ F+H      : {from: 0, to: 1}
  F+H < t ≤ F+H+W  : clear = P * (t - F - H) / W; from = clamp((clear - start) / len, 0, 1); to = 1
```

- [ ] **Step 1: Write the failing tests** (right-dominant tree, after `applyAnatomy`, unless stated):

```ts
it('a left injection never opacifies RCA segments')            // sample t every 100 ms: prox/mid/dist-rca, pda, plv, am → from === to
it('proximal fills before distal')                              // t = 450: lm.to === 1 and dist-lad.to < 1
it('during hold every left segment is fully opaque')            // t = 1500: all left nodes {from:0,to:1}
it('washout clears from the ostium outward')                    // t = 900+2000+550: lm.from === 1 (empty) and some left node has from < 1
it('nothing is opaque after the run')                           // t = cineDurationMs() + 1: every node empty
it('the contrast front only moves forward')                     // mid-lad.to non-decreasing for t = 0..900 step 50
it('side branches start part-way along their parent')           // d2.startDistanceMm > mid-lad.startDistanceMm and < mid-lad.startDistanceMm + mid-lad.lengthMm
it('dominance decides which injection fills the PDA')           // right tree: right injection, t=1500 → pda {0,1}; left-dominant tree: left injection, t=1500 → pda {0,1}
it('each variant tree contains only its own segment ids')       // left-dominant tree ids equal LEFT_DOMINANT_SEGMENTS ids (Review Focus 4)
```

- [ ] **Step 2:** Run `npx vitest run src/utils/contrast.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `contrast.ts` per the interfaces and algorithm.
- [ ] **Step 4:** Run `npx vitest run src/utils/contrast.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(cine): contrast fill, hold and washout model`.

### Task 5: Cine runs on the fluoro screen

**Files:**
- Create: `src/utils/polyline.ts`, `src/utils/polyline.test.ts`, `src/hooks/useCineRun.ts`, `src/components/controls/CineControls.tsx`
- Modify:
  - `src/components/two-d/FluoroCanvas.tsx`: new prop `opacity?: Map<string, OpaqueRange> | null`. Sample curves with `getPointAt` (arc-length uniform). When `opacity` is set, draw only `slicePolyline3D(points3d, from, to)` and skip empty ranges.
  - `src/components/two-d/Scene2D.tsx`: pass `opacity` through.
  - `src/App.tsx`: state `injectionSide: InjectionSide = 'left'`; `useCineRun`; render `CineControls` next to the view toggles.

**Interfaces:**
- Consumes: `VesselTree`, `InjectionSide`, `OpaqueRange`, `CineTiming`, `buildVesselTree`, `opacificationAt`, `cineDurationMs` (Task 4).
- Produces:
  - `slicePolyline3D(points: THREE.Vector3[], from: number, to: number): THREE.Vector3[]`. Slices by cumulative 3D length, with interpolated end points; returns `[]` when `to - from <= 0.001`.
  - `useCineRun(tree: VesselTree, side: InjectionSide, timing?: CineTiming): { playing: boolean; opacity: Map<string, OpaqueRange> | null; play: () => void; stop: () => void }`. `opacity` is `null` when idle (the normal road-map view). The hook updates every animation frame while playing, returns to `null` when the run ends, and stops and resets when `tree` or `side` changes (effect cleanup).
  - `CineControls` props: `{ side: InjectionSide; onSideChange: (s: InjectionSide) => void; playing: boolean; onPlay: () => void; onStop: () => void }`. Buttons: "Left inj." / "Right inj." and "Run cine" / "Stop".

- [ ] **Step 1: Write the failing tests**

```ts
// straight line (0,0,0) → (10,0,0) sampled at 11 points
it('full range returns the same end points')               // slice(0,1): first.x 0, last.x 10
it('half range ends half-way along the length')           // slice(0,0.5): last.x ≈ 5
it('a middle slice starts and ends at interpolated points') // slice(0.25,0.75): first.x ≈ 2.5, last.x ≈ 7.5
it('an empty or inverted range returns []')               // slice(0.5,0.5) and slice(0.7,0.2) → []
```

- [ ] **Step 2:** Run `npx vitest run src/utils/polyline.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `slicePolyline3D`, then `useCineRun`, `CineControls` and the FluoroCanvas, Scene2D and App wiring.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Manual check** with `npm run dev`:
  - At RAO 25 / CAU 25 with Left inj., Run cine: contrast fills from the LM outward, holds about 2 s, then clears from the ostium.
  - At LAO 45 with Right inj.: the RCA fills.
  - Switching dominance mid-run stops the run with no console errors.
- [ ] **Step 6:** Commit: `feat(cine): selective left/right cine runs on the fluoro view`.

### Task 6: Spine and diaphragm on the fluoro screen

**Files:**
- Create: `src/utils/landmarks.ts`, `src/utils/landmarks.test.ts`
- Modify: `src/components/two-d/FluoroCanvas.tsx`: draw the landmarks under the vessels. The spine is a soft vertical band of the projected width, with low alpha and blur. The diaphragm is a soft-edged fill below its top edge.

**Interfaces:**
- Consumes: `computeCameraBasis`, `ANATOMY_SCALE`.
- Produces:
  - `projectSpine(raoLao: number, cranialCaudal: number): { x: number; width: number }`. These are screen-plane values in the same frame FluoroCanvas uses before `ZOOM` (anatomy units × `ANATOMY_SCALE`; x = dot with `right`).
  - `diaphragmTopEdge(raoLao: number, cranialCaudal: number, samples?: number): { x: number; y: number }[]`. The upper edge of both domes, left to right, with y = dot with `up` (positive is up).
- Model constants (anatomy units):
  - **Spine:** axis x = 0, z = −4.5, running from y = +6 to y = −8; width 2.4.
  - **Domes:** paraboloid caps. Right apex (−3, −3.1, 0.5) and left apex (3, −3.9, 0). Semi-axes x 3.5 and z 4.5; the edge drops 1.5.

- [ ] **Step 1: Write the failing tests**

```ts
it("spine appears on the viewer's right in LAO and left in RAO") // projectSpine(45,0).x > 0.5 ; projectSpine(-30,0).x < -0.5
it('spine is central in AP')                                      // Math.abs(projectSpine(0,0).x) < 0.1
it('right hemidiaphragm sits higher than the left in AP')        // max y of points with x<0 > max y of points with x>0, at (0,0)
it('cranial angulation lifts the diaphragm into the image')      // max y at (0,30) > max y at (0,0)
it('every value is finite at extreme angles')                    // (±90, ±45) for both functions (Review Focus 5)
```

- [ ] **Step 2:** Run `npx vitest run src/utils/landmarks.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement both functions and the drawing.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Check by eye: at LAO 45 the spine shadow is on the right of the image.
- [ ] **Step 5:** Commit: `feat(fluoro): spine and diaphragm orientation landmarks`.

### Task 7: "Show me" challenge

**Files:**
- Create: `src/challenges/show-me.ts`, `src/challenges/show-me.test.ts`, `src/components/challenges/ShowMePanel.tsx`
- Modify:
  - `src/types/angles.ts`: `AppMode` adds `'challenges'`
  - `src/App.tsx`: add a "challenges" mode button that renders `ShowMePanel` for now; Task 9 replaces it with the shell

**Interfaces:**
- Consumes: `interpolateSegmentScore`, `scoreToRating` (`src/data/quality-matrix.ts`), `SegmentRating`.
- Produces:
  - `interface ShowMeItem { id: string; segmentId: string; prompt: string }`
  - `SHOW_ME_ITEMS: ShowMeItem[]`, with this exact copy:
    - `show-mid-lad` / mid-lad: "Show the mid LAD with its diagonals separated."
    - `show-dist-lad` / dist-lad: "Show the distal LAD."
    - `show-lm` / lm: "Open up the left main bifurcation."
    - `show-prox-lcx` / prox-lcx: "Show the proximal circumflex."
    - `show-om1` / om1: "Show the first obtuse marginal."
    - `show-d1` / d1: "Show the first diagonal."
    - `show-prox-rca` / prox-rca: "Show the proximal RCA."
    - `show-mid-rca` / mid-rca: "Show the mid RCA at full length."
    - `show-dist-rca` / dist-rca: "Show the crux and distal RCA."
    - `show-pda` / pda: "Show the PDA."
  - `interface ShowMeResult { score: number; rating: SegmentRating; passed: boolean; ideal: boolean; best: { raoLao: number; cranialCaudal: number; score: number } }`
  - `scoreShowMe(segmentId: string, raoLao: number, cranialCaudal: number): ShowMeResult`:
    - `score` = `interpolateSegmentScore`; `rating` = `scoreToRating(score)`
    - `passed` = `score >= 1.5`; `ideal` = `score >= 2.5`
    - `best` = the maximum over a grid of `raoLao` −90…90 and `cranialCaudal` −45…45, both in steps of 5. Scan `raoLao` in the outer loop and keep the first maximum.
  - `ShowMePanel` props: `{ item: ShowMeItem; raoLao: number; cranialCaudal: number; revealFeedback: boolean; onSubmit: (r: ShowMeResult) => void; onGoToBest: (raoLao: number, cranialCaudal: number) => void }`. It shows the prompt and a "Take shot" button. With `revealFeedback` it shows the rating, a pass or ideal message, the best view with a "Go to best view" button, and the existing `OptimalViewMap` for the segment.

- [ ] **Step 1: Write the failing tests**

```ts
it('AP cranial is ideal for the mid LAD')            // scoreShowMe('mid-lad', 0, 35): rating '+++', passed, ideal
it('the spider view fails the mid LAD')              // scoreShowMe('mid-lad', 45, -30).passed === false
it('RAO caudal is ideal for the distal LAD')         // scoreShowMe('dist-lad', -25, -25).rating === '+++'
it('LAO cranial passes the PDA')                     // scoreShowMe('pda', 25, 25).passed === true
it('best view for the mid LAD is cranial')           // scoreShowMe('mid-lad', 0, 0).best.cranialCaudal > 0
it('best view for the LM is ideal')                  // scoreShowMe('lm', 0, 0).best.score >= 2.5
it('scores stay finite at extreme angles')           // (±90, ±45): score and best.score finite (Review Focus 5)
```

- [ ] **Step 2:** Run `npx vitest run src/challenges/show-me.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `show-me.ts`, `ShowMePanel` and the App mode.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(challenges): "Show me" best-view challenge`.

### Task 8: "Name the segment" challenge

**Files:**
- Create: `src/challenges/name-segment.ts`, `src/challenges/name-segment.test.ts`, `src/components/challenges/NameSegmentPanel.tsx`
- Modify:
  - `src/components/two-d/FluoroCanvas.tsx` and `Scene2D.tsx`: new prop `highlightSegmentId?: string | null`. It draws that segment highlighted and ignores hover highlighting.
  - `src/App.tsx`: add a challenge sub-tab, "Name the segment".

**Interfaces:**
- Consumes: `QUALITY_MATRIX`, `RATING_SCORE`, `VIEW_PRESETS`, `InjectionSide`, `sideOf` (Task 4), `applyAnatomy` (Task 3).
- Produces:
  - `interface NameSegmentQuestion { segmentId: string; presetId: string; side: InjectionSide; options: string[]; answer: string }`
  - `bestPresetFor(segmentId: string): string`: the `QUALITY_MATRIX` entry with the highest `RATING_SCORE` for that segment; ties go to the earliest entry.
  - `buildNameSegmentQuestion(segments: ArterySegment[], rng: () => number): NameSegmentQuestion`. Picks the segment uniformly; options are the answer plus 3 distinct other ids from `segments`, Fisher–Yates shuffled with `rng`.
  - `segmentLabel(segment: ArterySegment): string`: `` `${name} (segment ${syntaxSegment})` ``, or just `name` when `syntaxSegment` is null or undefined.
  - `NameSegmentPanel` props: `{ question: NameSegmentQuestion; segments: ArterySegment[]; revealFeedback: boolean; onAnswer: (correct: boolean) => void }`. On mount it animates to the question's preset, shows only the question's side, and highlights the target with labels off.

- [ ] **Step 1: Write the failing tests** (seeded generator `mulberry32(seed)` defined in the test file):

```ts
it('bestPresetFor picks the textbook-ideal view')    // mid-lad → 'ap-cranial'; dist-lad → 'rao-caudal'; mid-rca → 'rao-straight'
it('questions are valid for every variant and seed') // 50 seeds × 3 variants (after applyAnatomy): 4 unique options incl. answer,
                                                     // presetId found in VIEW_PRESETS, side === sideOf(target)
it('labels show SYNTAX numbers where they exist')    // right-dominant: mid-lad → 'Mid LAD (segment 7)'; am → 'Acute Marginal'
```

- [ ] **Step 2:** Run `npx vitest run src/challenges/name-segment.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the module, the panel and the highlight prop.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(challenges): "Name the segment" challenge`.

### Task 9: Learner and Exam modes, results, safe progress saving

**Files:**
- Create: `src/challenges/session.ts`, `src/challenges/session.test.ts`, `src/utils/safe-storage.ts`, `src/utils/safe-storage.test.ts`, `src/components/challenges/ChallengeShell.tsx`
- Modify: `src/App.tsx` (the challenges mode renders `ChallengeShell`)

**Interfaces:**
- Consumes: `ShowMeItem`, `ShowMeResult`, `scoreShowMe`, `SHOW_ME_ITEMS` (Task 7); `NameSegmentQuestion`, `buildNameSegmentQuestion` (Task 8); `AngleState`.
- Produces:
  - `type ChallengeMode = 'learner' | 'exam'`; `type ChallengeKind = 'show-me' | 'name-segment'`
  - `interface ChallengeAttempt { kind: ChallengeKind; itemId: string; correct: boolean }`
  - `interface SessionSummary { total: number; correct: number; percent: number; byKind: Record<ChallengeKind, { total: number; correct: number }> }`
  - `summarizeSession(attempts: ChallengeAttempt[]): SessionSummary` (percent rounded to a whole number; 0 when empty)
  - `SESSION_LENGTH = 10`
  - `loadJSON<T>(key: string, fallback: T, storage?: Storage | null): T` and `saveJSON(key: string, value: unknown, storage?: Storage | null): boolean`. The default storage is `globalThis.localStorage`, read inside `try/catch`.
  - Storage key `'cathlab-trainer:v1:best'` → `Record<ChallengeKind, number>`, the best percent per kind.
  - `ChallengeShell` props: `{ segments: ArterySegment[]; angles: AngleState; animateTo: (a: AngleState) => void; onHighlightChange: (id: string | null) => void }`. It has kind tabs, a Learner/Exam toggle and 10 items per run.
    - Learner gives feedback after each item.
    - Exam gives none until the results screen. That screen shows per-kind scores, every item with its right answer, and a "Print results" button (`window.print()`), and saves the best percent.

- [ ] **Step 1: Write the failing tests**

```ts
// session.test.ts
it('an empty session scores 0%')                       // summarizeSession([]) → { total:0, correct:0, percent:0, byKind both {0,0} }
it('mixed attempts are counted per kind')              // 3 show-me (2 correct) + 2 name-segment (1 correct) → total 5, correct 3, percent 60, byKind correct

// safe-storage.test.ts (in-memory fake implementing getItem/setItem)
it('round-trips JSON')                                 // saveJSON('k',{a:1},fake) === true; loadJSON('k',null,fake) deep-equals {a:1}
it('returns the fallback when reading throws')         // getItem throws → loadJSON('k', 7, s) === 7
it('returns false when writing throws (quota)')        // setItem throws → saveJSON('k', 1, s) === false
it('returns the fallback on invalid JSON')             // getItem → '{oops' → fallback
it('copes with no storage at all')                     // loadJSON('k', 3, null) === 3; saveJSON('k', 1, null) === false (Review Focus 3)
```

- [ ] **Step 2:** Run `npx vitest run src/challenges/session.test.ts src/utils/safe-storage.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the modules and `ChallengeShell`; route Show me and Name the segment through it.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(challenges): learner/exam modes, results and saved bests`.

### Task 10: Branding, About and credits, disclaimer

**Files:**
- Create: `src/data/credits.ts`, `src/data/credits.test.ts`, `src/components/about/AboutDialog.tsx`
- Modify:
  - `src/App.tsx`: header title "CathLab Trainer" (keep the "Beta" badge); an "About" button; a footer with `DISCLAIMER` and the existing heart attribution
  - `index.html`: `<title>CathLab Trainer: angiography and PCI training game</title>` and the meta description "Free browser game that teaches cath lab nurses and techs angiographic views and PCI. Educational simulation, not for clinical use."

**Interfaces:**
- Produces:
  - `interface Credit { item: string; author: string; licence: string; url: string }`
  - `CREDITS: Credit[]`, exactly:
    - `{ item: 'iiviewer (CathLabSimulator) code', author: 'annasrahman.com', licence: "Used and modified with the author's permission", url: 'https://annasrahman.com' }`
    - `{ item: 'Realistic Human Heart (3D model)', author: 'neshallads', licence: 'CC BY 4.0', url: 'https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089' }`
  - `interface Reference { label: string; url: string }`
  - `REFERENCES: Reference[]`:
    - Di Mario & Sutaria, Heart 2005 (`https://heart.bmj.com/content/91/7/968.info`)
    - SYNTAX segment definitions (`https://syntaxscore.org/index.php/tutorial/definitions/14-appendix-i-segment-definitions`)
    - Normal coronary diameters by QCA, Indian Heart J 2021 (`https://doi.org/10.1016/j.ihj.2021.04.001`)
    - POT and Finet's law, Hoye 2018 (`https://pmc.ncbi.nlm.nih.gov/articles/PMC5808474`)
    - BJC guide to angiographic views (`https://bjcardio.co.uk/?p=35300`)
  - `DISCLAIMER = 'Educational simulation, not for clinical use.'`
  - `SIMPLIFICATIONS: string[]`, exactly:
    - "The coronary tree is a hand-built model, not a real patient."
    - "View ratings follow published textbook tables; the geometry shows foreshortening and overlap only."
    - "Contrast flow timing is illustrative."
    - "Spine and diaphragm are simplified shapes for orientation."
  - `AboutDialog` props: `{ open: boolean; onClose: () => void }`. It lists `CREDITS`, `REFERENCES`, `SIMPLIFICATIONS` and `DISCLAIMER`.

- [ ] **Step 1: Write the failing tests**

```ts
it('every credit is complete and links over https')   // non-empty item/author/licence; url starts with 'https://'
it('the two required credits are present')            // items include iiviewer and Realistic Human Heart
it('every reference links over https')
it('the disclaimer text is exact')                    // DISCLAIMER === 'Educational simulation, not for clinical use.'
```

- [ ] **Step 2:** Run `npx vitest run src/data/credits.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the data, `AboutDialog` and the header, footer and `index.html` changes.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(ui): CathLab Trainer branding, About & credits, disclaimer`.

### Task 11: Phase 1 release check

**Files:** none new.

- [ ] **Step 1:** Run `npm test && npm run typecheck && BASE_PATH=/cathlab-trainer/ npm run build && npm run check:offline`. Expected: all pass, and `No external loads`.
- [ ] **Step 2:** Push. Expected: the deploy workflow is green.
- [ ] **Step 3:** Open `https://mrgeek767.github.io/cathlab-trainer/` in the built-in browser.
  - Read the console. Expected: no errors.
  - Read the network requests. Expected: every request host is `mrgeek767.github.io` (Review Focus 1–2).
- [ ] **Step 4: Walk through the app.**
  - All 10 presets.
  - Cine: Left at RAO 25 / CAU 25 and Right at LAO 45; switch dominance during a run.
  - Show me × 3 in Learner mode.
  - Name the segment × 3 in Exam mode, then the results screen and print preview.
  - The About dialog.
  - The disclaimer is visible.
  - At 1366×768 the main screen fits without page scrolling (note it if not).
- [ ] **Step 5:** Tag the release: `git tag -a v0.1.0 -m "Phase 1: Angle Trainer" && git push --tags`. Send Omar the link and three things to try.
