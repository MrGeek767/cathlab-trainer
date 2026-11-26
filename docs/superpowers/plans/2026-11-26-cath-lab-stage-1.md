# Cath Lab Practice, Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Cath lab" tab where the learner predilates, stents and post-dilates a proximal LAD lesion over a guide and wire the "operator" has already placed, using a device shelf and an inflation device with compliance charts, and sees the result on the realistic monitor.

**Architecture:** The device engine is plain TypeScript in `src/practice/` (device data, compliance charts, the lesion's lumen, the inflation outcome model, sizing grades, the rail the devices ride on, and a reducer for the practice session), all unit-tested. React components in `src/components/practice/` show the step list, shelf, notes and the frosted inflation device; `PracticeDevices` draws the wire, balloon and stent on the monitor with the existing density materials, inside the beating-heart group. `App` adds the tab, holds the session through a `usePractice` hook, and routes monitor drags and keys to the device in hand.

**Tech Stack:** React 19, TypeScript (strict, noUncheckedIndexedAccess), three.js 0.170 with @react-three/fiber 9, Tailwind 3, Vitest 2 (jsdom per file with `// @vitest-environment jsdom`).

**Spec:** `docs/superpowers/specs/2026-11-26-cath-lab-practice-design.md` (Stage 1 = §5 item 1; §6, §7.1 balloons and stents, §7.4, §7.5, §7.6, §8, §9). Parent design: `docs/superpowers/specs/2026-11-25-cathlab-trainer-design.md`.

## Global Constraints

- Free, public code, no external loads at runtime (`npm run check:offline` must print "No external loads").
- The Phase 1 tabs keep working exactly as now; all existing tests stay green.
- Generic device names, no brands. Compliance values labelled illustrative.
- Grades: Best, Acceptable, Not suitable, Unsafe. Best in ECG green with ✓; Acceptable in plain ink with ✓; Not suitable in plain ink with –; Unsafe in alarm red with ✗. Red only for Unsafe.
- Same tokens and fonts as now; no glows or neon; frosted glass only for panels floating over the monitor; motion only in answer to actions; everything works under reduced motion.
- Every action works by mouse, by keys and by on-screen buttons (phones).
- Sentence case for all copy. Devices on the monitor are greyscale, drawn with the density model.
- Practice values (spec §6): right radial, 6F sheath, 6F EBU 3.5 guide seated by the operator; workhorse wire parked in the distal LAD; lesion in `prox-lad` starting 8 mm from its start, 12 mm long, 75% diameter stenosis; references 3.2 mm proximal and 3.1 mm distal (from the QCA table); right-dominant anatomy.
- Compliance charts (spec §7.4): semi-compliant nominal 6 atm, RBP 14 atm, +10% at RBP; non-compliant nominal 10 atm, RBP 20 atm, +4% at RBP; drug-eluting stent nominal 9 atm, RBP 16 atm, +6% at RBP.
- Lesion response (spec §7.4): balloon alone recoils to 75% of its chart diameter; stent reaches 90% of chart diameter at nominal and 95% at RBP after predilation, 85% at nominal without predilation; NC post-dilation brings the stent to 97% of the balloon's chart diameter.
- Outcome thresholds (spec §7.4): residual stenosis below 90% of reference; edge dissection risk above 110% of reference at an edge; geographic miss with less than 2 mm of landing zone at either end. Pressure within ±1 atm of the operator's call is on target.

## Review Focus

1. Leaving the Cath lab tab with the inflation device open, then coming back: the session, the device in hand and the pressure are as they were, and keys pressed in other tabs never move the device. (Task 10: `usePractice` keeps state across tab switches; keys only act when the monitor has focus in Cath lab.)
2. Moving the device past the wire tip, back into the guide, or while inflated: it stops at the limits and never moves while inflated. (Task 7 tests.)
3. Pressure input that is negative, above 30 atm, NaN from a drag, or past RBP without the confirm: clamped, ignored, or held at RBP until confirmed. (Task 7 tests.)
4. Dominance set to Left or Co-dominant in Explore before opening Cath lab: the practice patient is still right dominant, and the dominance control shows why it is locked. (Task 10 test of `effectiveDominance`.)
5. The final shot before any stent is deployed, or a second stent after one is in: refused, with the reason shown. (Task 7 tests; Task 11 render test for the disabled stents.)

---

### Task 1: Grades and references

**Files:**
- Create: `src/practice/grades.ts`
- Create: `src/components/practice/GradeBadge.tsx`
- Test: `src/practice/grades.test.ts`, `src/components/practice/GradeBadge.test.tsx`

**Interfaces:**
- Produces:
  - `type Grade = 'best' | 'acceptable' | 'not-suitable' | 'unsafe'`
  - `GRADE_LABEL: Record<Grade, string>`: 'Best', 'Acceptable', 'Not suitable', 'Unsafe'
  - `type ReferenceId = 'cit-2024' | 'stllr-2008' | 'sizing-review' | 'qca-2021' | 'charts'`
  - `PRACTICE_REFERENCES: Record<ReferenceId, { label: string; url: string | null }>`
  - `interface Note { key: string; grade: Grade | null; title: string; text: string; reference: ReferenceId | null }` (grade null = information only)
  - `worseGrade(a: Grade, b: Grade): Grade` (order best < acceptable < not-suitable < unsafe)
  - `GradeBadge({ grade }: { grade: Grade })`: a small pill with the symbol and the label

Reference values (exact):
- `cit-2024`: "Lesion preparation, CIT 2024", https://citoday.com/articles/2024-may-june/drug-coated-balloons
- `stllr-2008`: "Geographic miss, STLLR trial (Costa 2008)", https://doi.org/10.1016/j.amjcard.2008.02.053
- `sizing-review`: "Imaging-guided stent sizing review", https://pmc.ncbi.nlm.nih.gov/articles/PMC11307675
- `qca-2021`: "Normal coronary diameters by QCA, Indian Heart J 2021", https://doi.org/10.1016/j.ihj.2021.04.001
- `charts`: "Compliance values are illustrative", url null

- [ ] **Step 1: Write the failing tests**

```ts
it('orders grades from best to unsafe', () => {
  expect(worseGrade('best', 'acceptable')).toBe('acceptable')
  expect(worseGrade('unsafe', 'not-suitable')).toBe('unsafe')
})
it('labels the four grades in sentence case', () => {
  expect(Object.values(GRADE_LABEL)).toEqual(['Best', 'Acceptable', 'Not suitable', 'Unsafe'])
})
it('every reference with a link uses https', () => { /* each url null or startsWith('https://') */ })
// GradeBadge.test.tsx (jsdom)
it('shows red and a cross only for Unsafe', () => {
  // render each grade; unsafe has class text-alarm and text ✗; best has text-ecg and ✓;
  // not-suitable has neither text-alarm nor text-ecg and shows –
})
```

- [ ] **Step 2: Run them to see them fail** — `npx vitest run src/practice/grades.test.ts src/components/practice/GradeBadge.test.tsx`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** `grades.ts` and `GradeBadge.tsx` (pill: `rounded px-1.5 py-0.5 text-xs font-semibold`; colours per Global Constraints; symbol `aria-hidden`, label always visible).
- [ ] **Step 4: Run them to see them pass.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(practice): grades and references`.

### Task 2: Devices and compliance charts

**Files:**
- Create: `src/data/devices.ts`, `src/practice/compliance.ts`
- Test: `src/data/devices.test.ts`, `src/practice/compliance.test.ts`

**Interfaces:**
- Produces (devices.ts):
  - `interface ComplianceChart { nominalAtm: number; rbpAtm: number; growthAtRbp: number }`
  - `CHARTS: { semiCompliant: ComplianceChart; nonCompliant: ComplianceChart; stent: ComplianceChart }` with the Global Constraints values (growth 0.10, 0.04, 0.06)
  - `type BalloonKind = 'semi-compliant' | 'non-compliant'`
  - `interface Balloon { id: string; category: 'balloon'; kind: BalloonKind; diameterMm: number; lengthMm: number; chart: ComplianceChart }`
  - `interface Stent { id: string; category: 'stent'; diameterMm: number; lengthMm: number; chart: ComplianceChart }`
  - `type Device = Balloon | Stent`
  - `BALLOONS: Balloon[]`: semi-compliant 2.0 to 4.0 mm in 0.25 steps × 12, 15, 20 mm; non-compliant 2.0 to 4.5 mm in 0.25 steps × 8, 12, 15 mm
  - `STENTS: Stent[]`: 2.25 to 4.0 mm in 0.25 steps × 8, 12, 15, 18, 23, 28, 33, 38 mm
  - ids: `sc-2.50x15`, `nc-3.25x12`, `des-3.00x18` (diameter with two decimals)
  - `deviceById(id: string): Device | undefined`
  - `deviceName(device: Device): string`: "Semi-compliant balloon 2.50 × 15 mm", "Non-compliant balloon 3.25 × 12 mm", "Drug-eluting stent 3.00 × 18 mm"
- Produces (compliance.ts):
  - `diameterAt(device: Device, atm: number): number`: 0 below 2 atm (not open); otherwise `d × (1 + growthAtRbp × (atm − nominal) / (rbp − nominal))`
  - `pressureFor(device: Device, diameterMm: number): number`: the inverse (exact, not rounded)
  - `chartRows(device: Device): { atm: number; diameterMm: number }[]`: whole atm from `max(2, nominal − 4)` to `rbp`

- [ ] **Step 1: Write the failing tests**

```ts
it('lists the sizes in the spec', () => {
  expect(BALLOONS.filter(b => b.kind === 'semi-compliant')).toHaveLength(9 * 3)
  expect(BALLOONS.filter(b => b.kind === 'non-compliant')).toHaveLength(11 * 3)
  expect(STENTS).toHaveLength(8 * 8)
  expect(deviceById('des-3.00x18')?.category).toBe('stent')
})
it('names devices plainly, with no brands', () => {
  expect(deviceName(deviceById('sc-2.50x15')!)).toBe('Semi-compliant balloon 2.50 × 15 mm')
})
it('reads the chart: nominal gives the labelled size, RBP the growth', () => {
  const sc = deviceById('sc-2.50x15')!
  expect(diameterAt(sc, 6)).toBeCloseTo(2.5, 6)
  expect(diameterAt(sc, 14)).toBeCloseTo(2.75, 6)
  expect(diameterAt(deviceById('des-3.00x18')!, 16)).toBeCloseTo(3.18, 6)
  expect(diameterAt(deviceById('nc-3.00x12')!, 20)).toBeCloseTo(3.12, 6)
  expect(diameterAt(sc, 1.5)).toBe(0)
})
it('finds the pressure for a diameter', () => {
  expect(pressureFor(deviceById('des-3.00x18')!, 3.1)).toBeCloseTo(9 + 7 / 0.06 * (3.1 / 3 - 1), 6)
})
it('prints chart rows from a few atm below nominal up to RBP', () => {
  const rows = chartRows(deviceById('nc-3.00x12')!)
  expect(rows[0]!.atm).toBe(6)
  expect(rows.at(-1)!.atm).toBe(20)
})
```

- [ ] **Step 2: Run them to see them fail.** Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** both files (build the lists with loops; round the diameter to 2 decimals only in ids and names).
- [ ] **Step 4: Run them to see them pass.**
- [ ] **Step 5: Commit** `feat(practice): device shelf data and compliance charts`.

### Task 3: The lesion and its lumen

**Files:**
- Create: `src/practice/lesion.ts`
- Test: `src/practice/lesion.test.ts`

**Interfaces:**
- Consumes: `ArterySegment` (`src/types/anatomy.ts`, with `startRadius`/`endRadius` in mm)
- Produces:
  - `interface PracticeLesion { segmentId: string; startMm: number; lengthMm: number; stenosis: number }`
  - `PRACTICE_LESION: PracticeLesion = { segmentId: 'prox-lad', startMm: 8, lengthMm: 12, stenosis: 0.75 }`
  - `LUMEN_STEP_MM = 0.5`
  - `interface Lumen { stepMm: number; diameters: number[] }` (sample i at `i × stepMm` mm from the segment's start, covering the segment's drawn length)
  - `referenceAt(segment: ArterySegment, segmentLengthMm: number, mm: number): number`: linear from `2 × startRadius` to `2 × endRadius`
  - `initialLumen(segment: ArterySegment, segmentLengthMm: number, lesion: PracticeLesion): Lumen`: the reference, narrowed over the lesion by a smooth cosine dip whose deepest point (the centre) is `(1 − stenosis) × reference`
  - `lumenAt(lumen: Lumen, mm: number): number`: linear interpolation, clamped to the ends
  - `narrowest(lumen: Lumen, fromMm: number, toMm: number): { mm: number; diameterMm: number }`

- [ ] **Step 1: Write the failing tests**

```ts
const seg = { id: 'prox-lad', startRadius: 1.6, endRadius: 1.55 /* … */ } as ArterySegment
it('is the reference outside the lesion', () => {
  const lumen = initialLumen(seg, 31, PRACTICE_LESION)
  expect(lumenAt(lumen, 2)).toBeCloseTo(referenceAt(seg, 31, 2), 6)
  expect(lumenAt(lumen, 25)).toBeCloseTo(referenceAt(seg, 31, 25), 6)
})
it('narrows to a quarter of the reference at the lesion centre (75% stenosis)', () => {
  const lumen = initialLumen(seg, 31, PRACTICE_LESION)
  const n = narrowest(lumen, 8, 20)
  expect(n.mm).toBeCloseTo(14, 0)
  expect(n.diameterMm / referenceAt(seg, 31, 14)).toBeCloseTo(0.25, 2)
})
it('covers the whole drawn segment', () => {
  expect(initialLumen(seg, 31, PRACTICE_LESION).diameters).toHaveLength(31 / 0.5 + 1)
})
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `lesion.ts`.
- [ ] **Step 4: Run them to see them pass.**
- [ ] **Step 5: Commit** `feat(practice): the practice lesion and its lumen`.

### Task 4: Inflation outcome model

**Files:**
- Create: `src/practice/inflation.ts`
- Test: `src/practice/inflation.test.ts`

**Interfaces:**
- Consumes: `Device`, `diameterAt` (Task 2); `Lumen`, `PracticeLesion`, `referenceAt`, `lumenAt`, `narrowest` (Task 3)
- Produces:
  - `RESPONSE = { recoil: 0.75, stentPrepared: [0.90, 0.95], stentDirect: [0.85, 0.90], postDilation: 0.97, edgeRatio: 1.10, residualBelow: 0.90, landingMm: 2 } as const`
  - `interface Span { startMm: number; endMm: number }` (segment mm)
  - `interface PlacedStent extends Span { nominalDiameterMm: number }`
  - `type Finding = { kind: 'geographic-miss'; uncoveredMm: number } | { kind: 'edge-dissection-risk'; atMm: number; ratio: number } | { kind: 'residual-stenosis'; percentOfReference: number } | { kind: 'partial-cover'; coveredFraction: number }`
  - `interface Vessel { lumen: Lumen; stent: PlacedStent | null; predilated: boolean }`
  - `applyInflation(vessel: Vessel, device: Device, span: Span, atm: number, segment: ArterySegment, segmentLengthMm: number, lesion: PracticeLesion): { vessel: Vessel; findings: Finding[] }`

Algorithm (not fixed by the signature):
- `open = diameterAt(device, atm)`; nothing changes when `open === 0`.
- **Balloon with no stent under it:** at each sample in the span that lies in the lesion, the lumen becomes `max(old, recoil × open)`. Outside the lesion the lumen is unchanged. `predilated` becomes true when the span covers at least 75% of the lesion's length. A span covering less than all of the lesion adds `partial-cover`.
- **Stent:** within the span, lesion samples become `max(old, e × open)` where `e` runs linearly from the first to the second value of `stentPrepared` (or `stentDirect` when not predilated) as `atm` goes from nominal to RBP, clamped. Samples outside the lesion become `max(old, open)`. Store the stent. Add `geographic-miss` when the span starts later than `lesion.startMm − landingMm` or ends earlier than `lesion.startMm + lengthMm + landingMm` (`uncoveredMm` = the larger shortfall).
- **Balloon inside a stent (post-dilation):** samples in both the span and the stent become `max(old, postDilation × open)`. Balloon samples outside the stent follow the balloon rule.
- **Edges:** for a stent, at both span ends; for a balloon, at any end outside the stent. If `open / referenceAt(end) > edgeRatio`, add `edge-dissection-risk`.
- **Residual:** after a stent or a post-dilation, `narrowest(lumen, stent.startMm, stent.endMm)` against the reference there; below `residualBelow`, add `residual-stenosis` with `percentOfReference`.

- [ ] **Step 1: Write the failing tests** (use the real `prox-lad` from `applyAnatomy(RIGHT_DOMINANT_SEGMENTS, 'right')` and length 31)

```ts
it('a balloon opens the lesion and the vessel recoils to 75% of it', () => {
  // SC 2.50×15 over 5..20 at 6 atm: narrowest within 8..20 is 0.75 × 2.5 (≈1.875)
})
it('marks the vessel prepared when the balloon covers most of the lesion', () => { /* predilated true */ })
it('a 3.0 stent at nominal after predilation leaves residual narrowing (spec)', () => {
  // DES 3.00×18 over 5..23 at 9 atm after predilation: residual-stenosis present, ~87% of reference
})
it('the same stent at 13 atm is within 90% of reference', () => { /* no residual-stenosis */ })
it('without predilation the stent expands less', () => { /* 85% at nominal */ })
it('NC post-dilation brings the stent to 97% of the balloon chart size', () => { /* NC 3.25×12 at 10 atm inside the stent */ })
it('a stent that leaves less than 2 mm at an end is a geographic miss', () => { /* DES 3.00×15 over 7..22 */ })
it('an oversized stent risks edge dissection', () => { /* DES 3.50×18 at 16 atm: ratio at an edge > 1.10 */ })
it('a deflated device (under 2 atm) changes nothing', () => { /* 1.5 atm: same lumen, no findings */ })
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `inflation.ts`.
- [ ] **Step 4: Run them to see them pass.**
- [ ] **Step 5: Commit** `feat(practice): how the lesion responds to balloons and stents`.

### Task 5: Sizing grades

**Files:**
- Create: `src/practice/sizing.ts`
- Test: `src/practice/sizing.test.ts`

**Interfaces:**
- Consumes: `Device` (Task 2); `Note`, `Grade`, `worseGrade` (Task 1)
- Produces:
  - `type PracticeStep = 'predilate' | 'stent' | 'postdilate' | 'final' | 'done'`
  - `interface SizingContext { proximalRefMm: number; distalRefMm: number; lesionLengthMm: number; stentDiameterMm: number | null }`
  - `gradePick(step: PracticeStep, device: Device, ctx: SizingContext): Note`

Rules (spec §7.4 and §7.5; ratio = diameter ÷ distal reference):
- **Balloon in predilate or stent step (preparation):** semi-compliant 0.8 to 1.0, or non-compliant 0.9 to 1.1: Best (reference `cit-2024`). Below that range: Acceptable ("small; prepares less"). Above 1.1: Unsafe ("risks dissection").
- **Stent in predilate step:** Acceptable, title "Direct stenting" ("accepted for a focal, non-calcified lesion; the stent may expand less").
- **Stent diameter in stent step:** within ±0.15 mm of the distal reference: Best; 0.15 to 0.4 mm under: Acceptable ("will likely need post-dilation"); more than 0.15 over, or more than 0.4 under: Not suitable (reference `sizing-review`).
- **Stent length** (needed = lesion + 2 × 2 mm = 16): the shortest stent ≥ needed (18): Best; the next one (23): Acceptable ("longer than needed"); 28 or more: Not suitable ("far too long"); under 16: Not suitable ("edges left uncovered", reference `stllr-2008`). The note's grade is `worseGrade` of diameter and length.
- **Balloon in postdilate or final step:** non-compliant from the stent's diameter up to the proximal reference + 0.1: Best; larger: Not suitable ("edge dissection risk"); smaller than the stent: Not suitable ("won't expand the stent"); semi-compliant: Not suitable ("non-compliant is used at high pressure").

- [ ] **Step 1: Write the failing tests** with the practice values (proximal 3.2, distal 3.1, lesion 12):

```ts
it.each([
  ['predilate', 'sc-2.50x15', 'best'], ['predilate', 'nc-3.00x12', 'best'], ['predilate', 'sc-3.50x15', 'unsafe'],
  ['predilate', 'des-3.00x18', 'acceptable'],
  ['stent', 'des-3.00x18', 'best'], ['stent', 'des-3.25x18', 'best'], ['stent', 'des-2.75x18', 'acceptable'],
  ['stent', 'des-3.50x18', 'not-suitable'], ['stent', 'des-3.00x15', 'not-suitable'], ['stent', 'des-3.00x23', 'acceptable'],
  ['stent', 'des-3.00x28', 'not-suitable'],
  ['postdilate', 'nc-3.25x12', 'best'], ['postdilate', 'sc-3.25x12', 'not-suitable'], ['postdilate', 'nc-3.75x12', 'not-suitable'],
])('%s with %s is %s', (step, id, grade) => {
  expect(gradePick(step, deviceById(id)!, { proximalRefMm: 3.2, distalRefMm: 3.1, lesionLengthMm: 12, stentDiameterMm: step === 'postdilate' ? 3 : null }).grade).toBe(grade)
})
it('every graded note names its reference', () => { /* grade !== null → reference !== null */ })
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `sizing.ts` (titles and texts in sentence case, one or two sentences).
- [ ] **Step 4: Run them to see them pass.**
- [ ] **Step 5: Commit** `feat(practice): sizing grades with references`.

### Task 6: The rail

**Files:**
- Create: `src/practice/rail.ts`
- Test: `src/practice/rail.test.ts`

**Interfaces:**
- Consumes: `buildVesselPaths(segments)` (`src/utils/vessel-paths.ts`), `MM_TO_SCENE` (`src/utils/geometry.ts`)
- Produces:
  - `LAD_RAIL = ['lm', 'prox-lad', 'mid-lad', 'dist-lad'] as const`
  - `interface Rail { lengthMm: number; pointAt(mm: number): THREE.Vector3; tangentAt(mm: number): THREE.Vector3; startOf(segmentId: string): number }`
  - `buildRail(ids: readonly string[], paths: Map<string, THREE.Curve<THREE.Vector3>>): Rail` (lengths in mm = `curve.getLength() / MM_TO_SCENE`; positions outside 0..length clamp)

- [ ] **Step 1: Write the failing tests** (real right-dominant anatomy)

```ts
it('runs from the left main ostium to the end of the LAD', () => {
  const rail = buildRail(LAD_RAIL, buildVesselPaths(segments))
  expect(rail.pointAt(0).distanceTo(paths.get('lm')!.getPointAt(0))).toBeLessThan(1e-6)
  expect(rail.pointAt(rail.lengthMm).distanceTo(paths.get('dist-lad')!.getPointAt(1))).toBeLessThan(1e-6)
})
it('knows where each segment starts', () => { /* startOf('prox-lad') ≈ length of lm in mm */ })
it('clamps outside its ends', () => { /* pointAt(-5) equals pointAt(0) */ })
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `rail.ts`.
- [ ] **Step 4: Run them to see them pass.**
- [ ] **Step 5: Commit** `feat(practice): the rail devices ride on`.

### Task 7: The practice session

**Files:**
- Create: `src/practice/session.ts`
- Test: `src/practice/session.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 6.
- Produces:
  - `interface PracticeContext { rail: Rail; segment: ArterySegment; segmentLengthMm: number; lesion: PracticeLesion; guideTipMm: number; wireTipMm: number; proximalRefMm: number; distalRefMm: number }`
  - `interface OperatorCall { text: string; targetAtm: number }`
  - `interface PracticeState { step: PracticeStep; inHand: Device | null; tipMm: number; inflation: { atm: number; peakAtm: number; overRbpAllowed: boolean; needsConfirm: boolean } | null; call: OperatorCall | null; vessel: Vessel; notes: Note[] }`
  - `type PracticeAction = { type: 'pick'; device: Device } | { type: 'move'; deltaMm: number } | { type: 'inflate' } | { type: 'set-pressure'; atm: number } | { type: 'confirm-over-rbp' } | { type: 'deflate' } | { type: 'withdraw' } | { type: 'skip' } | { type: 'final-shot' } | { type: 'reset' }`
  - `initialPractice(ctx: PracticeContext): PracticeState` (step `predilate`, nothing in hand, initial lumen)
  - `practiceReducer(ctx: PracticeContext): (state: PracticeState, action: PracticeAction) => PracticeState`
  - `operatorCall(device: Device, step: PracticeStep, ctx: PracticeContext): OperatorCall`
  - `MAX_ATM = 30`, `PRESSURE_TOLERANCE_ATM = 1`, `WIRE_MARGIN_MM = 5`

Rules:
- **pick:** refused while inflating. A stent after one is placed is refused with a Not suitable note ("one stent covers this lesion"). Otherwise the device replaces any in hand, its tip starts at `guideTipMm`, and the `gradePick` note is added. Picking a stent in `predilate` moves the step to `stent`. A balloon picked in `final` counts as post-dilation.
- **move:** ignored while inflating or with nothing in hand; the tip is clamped to `[guideTipMm, wireTipMm − WIRE_MARGIN_MM]`.
- **inflate:** needs a device fully out of the guide (`tipMm − lengthMm ≥ guideTipMm`), else an information note ("advance it out of the guide first"). It opens the inflation at 0 atm and sets the operator's call:
  - predilate: "Inflate to nominal pressure." (nominal)
  - stent: "Deploy to X mm.", X = the distal reference, clamped between the stent's labelled diameter and its RBP diameter (when clamped to labelled: "Deploy at nominal pressure.")
  - postdilate or final: "Inflate to X mm.", X = the proximal reference, clamped the same way (when clamped to RBP: "Inflate to rated burst pressure.")
- **set-pressure:** ignores NaN; clamps to `[0, MAX_ATM]`; above RBP without `overRbpAllowed` holds at RBP and sets `needsConfirm`; tracks `peakAtm`.
- **confirm-over-rbp:** sets `overRbpAllowed`, clears `needsConfirm`, adds an Unsafe note ("past rated burst pressure risks rupture and dissection").
- **deflate:** turns the device span from rail mm into segment mm (`− rail.startOf(lesion.segmentId)`), calls `applyInflation` at `peakAtm`, then adds notes:
  - the pressure: on target within ±1 atm (Best), otherwise Not suitable, stating what the chart gives at the pressure used
  - a note for each finding (geographic miss Not suitable, `stllr-2008`; edge dissection risk Unsafe, `sizing-review`; residual stenosis information "post-dilate with a non-compliant balloon at high pressure"; partial cover information)
  
  Steps then move on: a balloon in `predilate` goes to `stent`; a stent goes to `postdilate`, and its delivery balloon is withdrawn (`inHand` null); a balloon in `postdilate` goes to `final`.
- **withdraw:** nothing in hand (refused while inflating).
- **skip:** `predilate` goes to `stent` with the Acceptable "Direct stenting" note; `postdilate` goes to `final`; otherwise ignored.
- **final-shot:** only in `postdilate` or `final` with a stent placed, else ignored. Goes to `done` with a result note from the narrowest lumen in the stent against its reference: residual ≤ 10% Best, ≤ 20% Acceptable, above 20% Not suitable (`sizing-review`).
- **reset:** `initialPractice(ctx)`.
- Note keys are unique and increase.

- [ ] **Step 1: Write the failing tests** (build a real context from right-dominant anatomy: `guideTipMm` 2, `wireTipMm` = rail length − 20)

```ts
it('walks the textbook path to a good result', () => {
  // pick sc-2.50x15 → move to cover the lesion → inflate → set-pressure 6 → deflate (step stent)
  // pick des-3.00x18 → position with 3 mm landing each side → inflate → set-pressure 13 → deflate (step postdilate)
  // pick nc-3.25x12 → position inside the stent → inflate → set-pressure 16 → deflate (step final) → final-shot
  // expect step 'done' and the last note graded 'best'
})
it('never moves past the wire tip, back into the guide, or while inflated', () => { /* Review Focus 2 */ })
it('clamps pressure, ignores NaN, and holds at RBP until confirmed', () => { /* Review Focus 3 */ })
it('refuses the final shot before a stent and a second stent after one', () => { /* Review Focus 5 */ })
it('calls the target the learner must read off the chart', () => {
  // stent des-3.00x18: text 'Deploy to 3.10 mm.', targetAtm ≈ pressureFor(device, 3.1)
})
it('grades the pressure used against the call', () => { /* 13 atm on a 3.1 mm call → best; 9 atm → not-suitable */ })
it('direct stenting is allowed and graded acceptable', () => { /* skip in predilate → step stent, acceptable note */ })
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `session.ts`.
- [ ] **Step 4: Run them to see them pass.**
- [ ] **Step 5: Commit** `feat(practice): the practice session`.

### Task 8: Drawing the lesion

**Files:**
- Modify: `src/utils/geometry.ts` (add `radiusAt` support; keep `buildTaperedTubeGeometry` and `addRadiusAttribute` behaviour)
- Modify: `src/components/two-d/ProjectedArteries.tsx` (optional `lumens` prop)
- Modify: `src/components/two-d/Scene2D.tsx` (pass `lumens` through)
- Test: `src/utils/geometry.test.ts`

**Interfaces:**
- Produces:
  - `buildProfiledTubeGeometry(curve: THREE.Curve<THREE.Vector3>, radiusAt: (t: number) => number, tubularSegments?: number, radialSegments?: number): THREE.TubeGeometry` (radius in mm per ring at curve fraction t). `buildTaperedTubeGeometry` becomes a call to it with a linear `radiusAt`.
  - `addRadiusProfileAttribute(geometry: THREE.BufferGeometry, radiusAt: (t: number) => number, tubularSegments?: number, radialSegments?: number): void`. `addRadiusAttribute` becomes a call to it.
  - `ProjectedArteries` prop `lumens?: ReadonlyMap<string, (mm: number) => number>`: lumen **radius** in mm by distance along the segment's drawn path. The artery maps each ring of the extended tube to mm along the original segment (subtract the start overlap), so the narrowing sits where the lesion is. It is used for both the tube width and `aRadius`, in fluoro and diagram.
  - `Scene2D` prop `lumens?: ReadonlyMap<string, (mm: number) => number>`, passed to `ProjectedArteries`.

- [ ] **Step 1: Write the failing test**

```ts
it('shapes each ring to a radius profile', () => {
  const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(0, 1, 0), v(0, 2, 0)])
  const tube = buildProfiledTubeGeometry(curve, t => (t > 0.4 && t < 0.6 ? 0.5 : 2), 20, 6)
  // ring 10 (t = 0.5) radius ≈ 0.5 × MM_TO_SCENE from the centre; ring 0 ≈ 2 × MM_TO_SCENE
  addRadiusProfileAttribute(tube, t => (t > 0.4 && t < 0.6 ? 0.5 : 2), 20, 6)
  // aRadius at ring 10 = 0.5, at ring 0 = 2
})
```

- [ ] **Step 2: Run it to see it fail.**
- [ ] **Step 3: Implement** the geometry changes and the `lumens` prop.
- [ ] **Step 4: Run the geometry tests and the whole suite.** Expected: all pass (the existing taper tests are unchanged).
- [ ] **Step 5: Commit** `feat(practice): draw the lesion's narrowing in the lumen`.

### Task 9: Drawing the devices

**Files:**
- Create: `src/components/two-d/PracticeDevices.tsx`
- Create: `src/practice/device-shapes.ts` (the pure geometry decisions)
- Modify: `src/components/two-d/Scene2D.tsx` (render `PracticeDevices` inside `HeartMotion` when given)
- Test: `src/practice/device-shapes.test.ts`

**Interfaces:**
- Consumes: `Rail` (Task 6), `Device`, `diameterAt` (Task 2), `PlacedStent` (Task 4); `lumenMaterial`, `CONTRAST_ATTENUATION_PER_MM`, `VESSEL_LAYER`, `VESSEL_BEHIND_LAYER` (`src/components/two-d/density.ts`); `buildTaperedTubeGeometry`, `addRadiusAttribute`, `addAxisAttribute` (geometry)
- Produces:
  - `interface DeviceScene { rail: Rail; guideTipMm: number; wireTipMm: number; inHand: Device | null; tipMm: number; atm: number | null; stent: { startRailMm: number; endRailMm: number; diameterMm: number } | null }`
  - `markerPositions(inHand: Device, tipMm: number): [number, number]` (rail mm of the two markers: the working length's ends, `tipMm − lengthMm` and `tipMm`)
  - `balloonDiameterShown(inHand: Device, atm: number | null): number` (0 when deflated or below 2 atm, else `diameterAt`)
  - `Scene2D` prop `devices?: DeviceScene | null`
  - `PracticeDevices({ scene }: { scene: DeviceScene })`

What it draws (all greyscale, on the vessel layers, front and behind pass, inside `HeartMotion`):
- the wire from `guideTipMm` to `wireTipMm`, as a thin dark line with its last 30 mm denser (the radiopaque tip) and a short curved tip
- the device in hand: two small dense markers, plus the shaft from the guide tip
- an inflated balloon: a contrast-filled cylinder between the markers at `balloonDiameterShown`, at half contrast density (a 50:50 mix)
- a placed stent: a faint shell along its span at its diameter

Draw radii, densities and the tip's curve are left to the builder; the wire must read as a fine dark line at 620 px.

- [ ] **Step 1: Write the failing tests**

```ts
it('puts the markers at the ends of the working length', () => {
  expect(markerPositions(deviceById('des-3.00x18')!, 40)).toEqual([22, 40])
})
it('shows the balloon only when it is open', () => {
  expect(balloonDiameterShown(deviceById('sc-2.50x15')!, null)).toBe(0)
  expect(balloonDiameterShown(deviceById('sc-2.50x15')!, 1)).toBe(0)
  expect(balloonDiameterShown(deviceById('sc-2.50x15')!, 6)).toBeCloseTo(2.5, 6)
})
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `device-shapes.ts`, `PracticeDevices.tsx` (dispose geometries and materials on change and unmount), and the `Scene2D` prop.
- [ ] **Step 4: Run the tests, typecheck, and look at the monitor** (capture with the screenshot tools: the wire visible in the LAD, markers visible, a balloon visible when inflated).
- [ ] **Step 5: Commit** `feat(practice): wire, balloon and stent on the monitor`.

### Task 10: The Cath lab tab and its panel

**Files:**
- Modify: `src/types/angles.ts` (`AppMode` adds `'cathlab'`)
- Modify: `src/components/layout/ModeTabs.tsx` (fifth tab "Cath lab" with an icon)
- Create: `src/hooks/usePractice.ts`
- Create: `src/practice/app-rules.ts` (`effectiveDominance`)
- Create: `src/components/practice/PracticePanel.tsx`
- Modify: `src/hooks/useDragRotation.ts` (option `enabled?: boolean`, default true)
- Create: `src/hooks/useDevicePush.ts`
- Modify: `src/App.tsx`
- Test: `src/practice/app-rules.test.ts`, `src/hooks/usePractice.test.tsx`, `src/components/practice/PracticePanel.test.tsx`, `src/hooks/useDevicePush.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 to 9.
- Produces:
  - `effectiveDominance(mode: AppMode, chosen: Dominance): Dominance` (right in `cathlab`, else `chosen`)
  - `usePractice(): { ctx: PracticeContext; state: PracticeState; dispatch: (a: PracticeAction) => void; lumens: ReadonlyMap<string, (mm: number) => number>; devices: DeviceScene }`
    - Always uses the right-dominant anatomy (memoised once), so a dominance change in another tab never resets the practice.
    - Builds the rail from `buildVesselPaths(anatomy)` and `LAD_RAIL`, with `guideTipMm` 2 and `wireTipMm` = rail length − 20.
    - Takes the references from the `prox-lad` segment.
    - The state lives in App, so it survives tab switches (Review Focus 1).
  - `useDevicePush({ enabled, onMove })`: returns `{ containerRef }`.
    - Pointer drag moves the device: right or up advances, left or down withdraws, at 0.08 mm per pixel, capped at 25 mm per second.
    - It ignores targets inside `[data-no-drag]`.
    - Keys act only while the monitor has focus (it is `tabIndex={0}`): ArrowUp pushes 1 mm, ArrowDown pulls 1 mm, I opens the inflation device. Space injects contrast through an `onInject` callback.
  - `PracticePanel({ state, onAction, onFinalShot })`: the step list, the shelf, the device in hand, the notes and Start again.

Panel content:
- **Steps:** Predilate (optional, with "Stent directly"), Stent, Post-dilate (optional, with "Skip"), Final shot. Each is shown as done, current or to come. The Final shot button is enabled only when allowed.
- **Shelf:** a Segmented control for Balloons and Stents. Balloons have a Semi-compliant / Non-compliant filter, stents a length filter. A compact grid of sizes; picking dispatches `pick`. Once a stent is placed, stents are disabled with the reason.
- **In hand:** the device name, the compliance chart (from `chartRows`, with nominal and RBP marked), and Inflate and Withdraw buttons.
- **Notes:** newest first, each with a `GradeBadge`, its text and its reference link.
- **Start again:** dispatches `reset`.

App changes:
- In `cathlab`:
  - dominance is `effectiveDominance`, and the dominance control is locked with the reason "The practice patient is right dominant"
  - the injection side is left, locked with the reason "The practice injects the left coronary"
  - `drag2D` is disabled and `useDevicePush` drives the monitor
  - Scene2D gets `lumens` and `devices`
  - the right column shows `PracticePanel`
- The final shot plays a left cine run and dispatches `final-shot`.

- [ ] **Step 1: Write the failing tests**

```ts
// usePractice.test.tsx (jsdom)
it('keeps its session across re-renders, as when the learner leaves the tab and comes back', () => {
  /* render the hook, dispatch a pick, re-render the host: state.inHand is still that device */
})
it('the practice patient is always right dominant', () => {
  expect(effectiveDominance('cathlab', 'left')).toBe('right')
  expect(effectiveDominance('explore', 'left')).toBe('left')
})
// PracticePanel.test.tsx (jsdom)
it('picking a size in the shelf dispatches it', () => { /* click "3.00 × 18" under Stents → onAction({type:'pick', device: des-3.00x18}) */ })
it('disables stents once one is placed, and says why', () => { /* state.vessel.stent set → stent buttons disabled, reason visible */ })
it('offers the final shot only when allowed', () => { /* step final with stent → enabled; step predilate → disabled */ })
// useDevicePush.test.tsx (jsdom)
it('dragging right or up advances, left or down withdraws', () => { /* pointer events → onMove(+), onMove(−) */ })
it('keys only act while the monitor has focus', () => { /* keydown on document without focus → no onMove; focused → onMove(1) */ })
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** the files and App wiring.
- [ ] **Step 4: Run the tests, the whole suite and the typecheck.**
- [ ] **Step 5: Commit** `feat(practice): the Cath lab tab, its panel and device controls`.

### Task 11: The inflation device and device buttons

**Files:**
- Create: `src/components/practice/InflationDevice.tsx`
- Create: `src/components/practice/DeviceButtons.tsx`
- Modify: `src/App.tsx` (render both over the monitor in `cathlab`, inside `data-no-drag` wrappers)
- Test: `src/components/practice/InflationDevice.test.tsx`, `src/components/practice/DeviceButtons.test.tsx`

**Interfaces:**
- Consumes: `PracticeState`, `PracticeAction`, `OperatorCall` (Task 7); `chartRows`, `diameterAt` (Task 2)
- Produces:
  - `InflationDevice({ device, inflation, call, onAction })`, shown while `state.inflation` is set. It is a frosted panel over the bottom of the monitor (`bg-panel/60 backdrop-blur-md border border-white/10`) holding:
    - the operator's call
    - an SVG gauge from 0 to 30 atm, with the RBP region marked
    - the pressure and the live diameter
    - the chart, with the current row highlighted and nominal and RBP marked
    - a press-and-hold "Inflate" button (+2.5 atm per second while held)
    - ↑ and ↓ keys (±1 atm) and the mouse wheel (±0.5 atm) while it has focus
    - "Deflate", which dispatches `deflate`
    - when `needsConfirm` is set: "Above rated burst pressure. Go higher?" with a "Go higher" button, which dispatches `confirm-over-rbp`
  - `DeviceButtons({ disabled, onMove, onInflate })`: "Pull back" and "Push" (press and hold repeats 1 mm steps) and "Inflate". On-screen buttons for phones and anyone without a mouse.

- [ ] **Step 1: Write the failing tests**

```ts
it('shows the call, the pressure and the diameter the chart gives', () => { /* des-3.00x18 at 13 atm → "13 atm", "3.10 mm", call text */ })
it('raises pressure with the keys and deflates', () => { /* ArrowUp → onAction set-pressure 14; Deflate click → deflate */ })
it('asks before going past rated burst pressure', () => { /* needsConfirm → "Go higher" → confirm-over-rbp */ })
it('offers push, pull and inflate as buttons with names', () => { /* getByRole button names */ })
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** both components and the App placement.
- [ ] **Step 4: Run the tests, then capture the monitor** with the inflation device open at 1366×768, 1920×1080 and 390 px, and check it is readable over the image.
- [ ] **Step 5: Commit** `feat(practice): inflation device and device buttons`.

### Task 12: Documentation and About

**Files:**
- Modify: `src/data/credits.ts` (REFERENCES gains `stllr-2008`, `sizing-review` and `cit-2024` with the Task 1 labels and links; SIMPLIFICATIONS gains "Devices, compliance charts and the lesion's response are simple models with illustrative values.")
- Modify: `src/data/credits.test.ts` (the simplifications count; the new references link over https)
- Modify: `README.md` ("What's in it" gains the Cath lab practice)

- [ ] **Step 1: Update the credits test first** (expect 5 simplifications; expect the STLLR link). Run it; expected FAIL.
- [ ] **Step 2: Update** `credits.ts` and README. Run the test; expected PASS.
- [ ] **Step 3: Commit** `docs: Cath lab practice in About and the README`.

---

## After the last task

1. Run the full suite, the typecheck, `BASE_PATH=/cathlab-trainer/ npm run build` and `npm run check:offline`.
2. Walk the practice end to end in the browser at all three sizes.
3. Get an independent review of the branch on the most capable model, then fix its Critical and Important findings with tests.
4. Merge, push, and check the live site.
