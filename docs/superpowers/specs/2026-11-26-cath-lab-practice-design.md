# Cath lab practice (Phase 2, the device engine): design

Status: approved by Omar, 26 Nov 2026, with the fourth grade ("Not suitable"). Builds on Design v1.1 (`2026-11-25-cathlab-trainer-design.md`), §6.5 device engine, §6.8 nurse/tech tasks and §6.9 interface.

## 1. Intent

Phase 1 taught learners to read the image. Phase 2 lets them handle the equipment: choose a guide catheter, seat it, steer a wire, then size and inflate a balloon and a stent, watching the result on the same realistic monitor. The audience is cath lab nurses and technologists. In the lab they prepare and pass the devices, check sizes and compatibility, run the inflation device and watch the pressure trace. Wire steering is the operator's job, but doing it helps them understand and anticipate it, and Omar asked for it.

The three full cases (patient story, scoring, debrief) are Phase 3. Until they exist, the engine lives in a **Cath lab practice tab**: one practice lesion, with feedback at each step but no score. Omar chose this (option 1). The practice later becomes Case 1's tutorial.

## 2. Goals, non-goals, anti-goals

**Goals**
- A fifth tab, "Cath lab", with one practice lesion in the proximal LAD.
- A device shelf of generic guides, wires, balloons and stents, with French-size compatibility checks.
- Seating the guide in the left main with the mouse, and a pressure trace that damps when the guide sits too deep.
- Steering a 0.014-inch wire along the vessels with the mouse: push and pull, turn the tip to choose branches.
- Positioning a balloon or stent by its markers, and inflating it with an inflation device whose compliance chart turns pressure into diameter.
- Feedback at each step, graded with a reference, using the starter rules in v1.1 §6.7 (grades in §7.5).
- The same look as now, polished. Frosted glass for panels that float over the X-ray image.

**Not in Phase 2** (Phase 3 or later)
- patient story, ECG and vitals panel, access choice, scoring, debrief, badges
- radiation and contrast meters, ACT, reactions
- the other two lesions (RCA occlusion, LAD/D1 bifurcation), thrombus, no-reflow
- physics-based devices, imaging (IVUS/OCT), brands
- the answer-key spreadsheet (Phase 3 moves the practice's rules into it)

**Anti-goals** (failures even if it works)
- teaching anything unsafe: going past rated burst pressure, or pushing a stiff wire hard, never passes silently
- brand names, or one operator's preference presented as the only right answer
- a cartoonish or game-like look; neon colours, glows, stock "AI" styling
- losing the realism of the monitor: devices look as they do on fluoro (dark radiopaque lines and markers, greyscale)

## 3. Constraints

Everything in v1.1 §3 still holds: free, public code, no external loads, Chrome or Edge on a hospital PC. Also:
- The Phase 1 tabs keep working exactly as now.
- Mouse first, but every action also has keyboard keys and on-screen buttons, so it works on a phone and without a mouse (staff already use the app on phones).
- Device values are generic and labelled illustrative. Reviewers confirm thresholds before Phase 3 scores them.

## 4. Approaches

| | Approach | Trade-offs | Decision |
|---|---|---|---|
| 1 | A Cath lab practice tab with one practice lesion, built in three stages that each go live | Staff can try it now; each stage gets real feedback; becomes Case 1's tutorial | **Chosen by Omar** |
| 2 | Build the engine with no screen until the cases arrive | Less UI work now; nothing to try or review until Phase 3 | Not chosen |

## 5. Stages

Each stage ends with a review and goes live, and the practice works at every stage: whatever the learner doesn't do yet is already done "by the operator".

1. **Shelf, lesion and inflation.** The practice opens with a 6F EBU 3.5 guide seated in the left main and a workhorse wire parked in the distal LAD. The learner predilates, stents and optionally post-dilates the lesion: picks each device from the shelf, positions it by its markers, and inflates it with the inflation device. A final contrast shot shows the result.
2. **Guide and pressure trace.** The learner picks the guide (French size checked against the 6F sheath), seats it in the left main with the mouse, and watches the pressure trace; seating it too deep damps the trace, and the learner must pull back.
3. **Wire.** The learner picks a wire and steers it from the guide tip, through the left main into the LAD (not the circumflex, diagonal or septal), across the lesion and out to the distal LAD.

## 6. The practice lesion

- **Where:** proximal LAD (segment 6), right-dominant anatomy. The right radial artery, a 6F sheath and a 6F guide are fixed for now.
- **What:** a focal, non-calcified stenosis of about 75% diameter, 12 mm long, starting about 8 mm past the left main bifurcation.
- **Reference diameters** come from the existing QCA table: 3.2 mm proximal, 3.1 mm distal.
- **On the monitor,** the stenosis shows as a narrowing of the contrast column, and the lumen after each inflation shows the diameter achieved. The narrowing is part of the contrast density model (the lumen radius along the vessel), so it obeys the same foreshortening and overlap as everything else.

## 7. The device engine

### 7.1 Shelf

A panel listing devices by category, in generic terms (v1.1 call 2):

| Category | Choices (illustrative) |
|---|---|
| Guide catheters | 6F or 7F. JL 3.5, 4, 4.5, 5; JR 4, 5; EBU 3.5, 3.75, 4, 4.5; AL 1, 2 |
| Wires, 0.014 inch | workhorse (soft tip, moderate support); hydrophilic polymer-jacketed; extra support; stiff-tip crossing wire |
| Balloons | semi-compliant 2.0 to 4.0 mm (0.25 steps) × 12, 15, 20 mm; non-compliant 2.0 to 4.5 mm × 8, 12, 15 mm |
| Stents (drug-eluting) | 2.25 to 4.0 mm (0.25 steps) × 8, 12, 15, 18, 23, 28, 33, 38 mm |

Each device shows its key facts, and its compliance chart for balloons and stents. **Compatibility:** a guide larger than the sheath is refused with an explanation (a nurse/tech check from v1.1 §6.8), and every balloon and stent listed fits a 6F guide.

### 7.2 Guide catheter and pressure trace

- The guide runs up from the radial artery to the aortic root. **Each curve family has its own recognisable shape** on the monitor (JL, JR, EBU and AL, scaled by size), so a JL 3.5 and an AL 2 look different, and a JR visibly fails to reach the left main. To make that work, the aortic root is redrawn with its sinuses, so the coronary ostia sit on its wall (today they sit inside the drawn aorta, about 9 mm from its centre line).
- In the root, the learner **turns** the guide (scroll, right-drag, keys or buttons) and **pushes or pulls** it (drag, keys or buttons).
- Its tip has three states for the left main: **free** in the sinus (no engagement), **engaged** (coaxial, the normal position) and **deep** (pushed in beyond a set depth).
- **Fit** depends on the curve family and size against the left main from the right radial in a normal aorta. Starter rule (EuroIntervention Tools & Techniques): EBU 3.5 or JL 3.5 is best (a curve 0.5 smaller than from the femoral); one size either side is acceptable; a JR curve cannot reach the left main; an AL is a support option, not a first choice in a normal aorta. Fit sets how easily the tip engages, and how much **support** the guide gives.
- **Pressure trace:** an aortic pressure waveform, about 120/70 mmHg, in step with the ECG and the beat. Free and engaged positions show a normal trace. A deep position **damps** it (lower amplitude, rounded peak, no dicrotic notch). The learner has to notice and pull back, as a nurse would tell the operator. A "Pressure damped, pull back" button lets them flag it. In practice mode a missed damping gets feedback after a few beats.
- **Support:** pushing a balloon or stent through the lesion with a weak-support guide can back the guide out of the ostium. The learner re-engages and tries again.

### 7.3 Wire (rail model)

- The wire's position is a distance in mm along the vessel centre lines, starting at the guide tip. It is drawn as a thin dark line along the vessel, with a short curved tip, as on fluoro.
- **Drag** on the monitor advances or withdraws it (speed-limited). **Scroll** or right-drag turns the tip. Keys and on-screen buttons do the same.
- At a branch point, the tip enters the branch whose direction lies within about 35° of where the tip points, turned around the vessel's axis; otherwise it stays in the main vessel. So the learner turns the tip to choose the LAD at the left main bifurcation and to stay out of the diagonal and septal branches.
- Wire choice affects crossing. For this focal lesion any workhorse crosses. A stiff-tip crossing wire pushed hard raises a dissection warning, and a hydrophilic wire running too far into a small distal branch raises a perforation warning. Both are tiered: workhorse best, hydrophilic and extra support acceptable but not first choice here, stiff-tip unsafe for this lesion.
- Pulling the wire back across the lesion after stenting is allowed; the practice reminds the learner to keep wire position.

### 7.4 Balloons, stents and the inflation device

- **Delivery:** a balloon or stent rides on the wire. The learner pushes it to the lesion and positions it by its two radiopaque markers, shown as small dark dots on fluoro. It cannot go past the wire tip, and it can't be delivered with no wire across the lesion.
- **Inflation device:** a frosted panel over the monitor. It has a pressure gauge (0 to 30 atm) that the learner raises by holding a button, dragging, scrolling or using keys, plus Deflate. Beside the gauge is the device's **compliance chart** with nominal and rated burst pressure (RBP) marked. The live diameter at the current pressure is shown on the chart and on the monitor, where the balloon fills with contrast and widens.
- **Compliance charts** (illustrative, typical ranges; reviewers confirm):
  - semi-compliant: nominal 6 atm, RBP 14 atm, about +10% diameter at RBP
  - non-compliant: nominal 10 atm, RBP 20 atm, about +4% at RBP
  - drug-eluting stent: nominal 9 atm, RBP 16 atm, about +6% at RBP
- **Who sets the pressure:** as in the lab, the operator calls the target before each inflation ("inflate to nominal", "to 3.25 mm"), and the learner reads the chart and dials it in. This is the nurse/tech task in v1.1 §6.8. Within ±1 atm of the chart pressure is correct (a placeholder tolerance). What happens to the vessel always follows the pressure actually used.
- **Safety:** pressure above RBP needs a deliberate confirm and always earns an Unsafe note. Burst is not simulated.
- **How the lesion responds** (illustrative, for the reviewers to set):
  - A balloon alone opens the lesion to its chart diameter while inflated, then the vessel **recoils** to about 75% of it.
  - A stent holds the lumen open but **under-expands** against the lesion. After predilation it reaches about 90% of its chart diameter at nominal pressure and about 95% at RBP. Without predilation it reaches about 85% at nominal.
  - A non-compliant post-dilation balloon at high pressure brings the stent to about 97% of the balloon's chart diameter.
  - So a 3.0 mm stent at nominal pressure leaves a residual narrowing, and higher pressure or post-dilation fixes it. That is why post-dilation exists.
- **Outcome** after each inflation updates the lumen at the lesion:
  - **residual stenosis** if the stent is expanded to less than 90% of the reference
  - **edge dissection risk** if it is oversized by more than 10% at an edge
  - **geographic miss** if the stent doesn't cover the lesion with at least 2 mm to spare at each end
  - These thresholds are placeholders from the cited sources, for the reviewers to set.
- **Predilation is optional.** Direct stenting is accepted for a focal, non-calcified lesion, so it is graded Acceptable rather than wrong. In the model the stent then expands less, so it often needs post-dilation.
- **Sizing feedback** (starter rules, v1.1 §6.7):
  - predilation: two accepted approaches, both graded Best: semi-compliant at about 0.8:1 to 1:1 of the reference, or non-compliant at about 1:1 (CIT 2024). Above about 1.1:1 risks dissection.
  - stent diameter: matched to the distal reference (3.0 or 3.25 mm here)
  - stent length: covers the lesion plus landing zones (18 mm here)
  - post-dilation: non-compliant, no larger than the proximal reference

### 7.5 Grades

v1.1 has three grades. This design adds a fourth, so red stays for real danger:

| Grade | Meaning | Shown as |
|---|---|---|
| Best | the accepted first choice | ECG green, ✓ |
| Acceptable | works, with a trade-off | plain ink, ✓ |
| Not suitable | won't do the job, but not dangerous | plain ink, – |
| Unsafe | could harm the patient | alarm red, ✗ |

Starter grades, for the reviewers to confirm:

| Choice | Grade | Why |
|---|---|---|
| EBU 3.5 or JL 3.5, right radial | Best | a curve 0.5 smaller than from the femoral |
| EBU 3, 3.75 or 4; JL 3 or 4 | Acceptable | within half a size |
| EBU 4.5, JL 4.5 or 5 | Not suitable | too large from the radial; poor coaxial seat |
| AL 1 or 2 | Acceptable, with a caution | strong support, but not a first choice in a normal aorta; higher ostial dissection risk |
| JR 4 or 5 | Not suitable | can't reach the left main |
| 7F guide through a 6F sheath | Not suitable | won't fit; the nurse/tech compatibility check |
| workhorse wire | Best | soft tip, 1:1 torque, moderate support |
| hydrophilic or extra-support wire | Acceptable | not first choice for a simple lesion |
| stiff-tip crossing wire | Unsafe | dissection risk in a simple lesion |
| stent 18 mm | Best | covers 12 mm plus landing zones |
| stent 15 mm | Not suitable | edges left uncovered (geographic miss) |
| stent 23 mm | Acceptable | longer than needed |
| stent 28 mm or more | Not suitable | far too long; covers side branches needlessly |
| semi-compliant balloon for post-dilation | Not suitable | non-compliant is used at high pressure |
| inflating past RBP | Unsafe | risks rupture and dissection |

### 7.6 Practice flow and feedback

A step list in the right column shows what to do next and marks each step done:

- Stage 3: choose wire, wire the LAD.
- Stage 2: choose guide, seat guide.
- Stage 1: predilate, stent, post-dilate (optional), final shot.

Each choice gets an immediate note: its grade, one or two sentences of why, and the reference. A "Start again" button resets the practice. There is no score; Phase 3 adds scoring and the debrief.

## 8. Screen and interaction

```
[ Explore | Learn | Quiz | Challenges | Cath lab ]
┌ C-arm pad ┐ ┌──────── Monitor ─────────────┐ ┌ Step list ─────┐
│ sliders   │ │ guide, wire, balloon, stent  │ │ ✓ Guide seated │
│ views     │ │                              │ │ → Predilate    │
│ contrast  │ │ ┌ frosted: pressure trace ─┐ │ ├ Device shelf ──┤
│           │ │ └──────────────────────────┘ │ │ Balloons ▸     │
│           │ │ ┌ frosted: inflation dev. ─┐ │ │ Stents ▸       │
└───────────┘ └──────────────────────────────┘ └────────────────┘
               device controls: ◀ pull  push ▶   ↺ turn ↻
```

- In this tab, dragging on the monitor moves the device in hand instead of turning the C-arm. The C-arm still turns with the left pad's sliders and standard views.
- **Keys:** up and down push and pull, left and right turn, space injects contrast, I opens the inflation device.
- The monitor keeps the road map by default while learning; Real fluoro makes the learner puff contrast to see the vessels, as in the lab.
- **Frosted glass:** the pressure trace and the inflation device float over the bottom of the monitor as translucent, blurred panels, so the image stays visible behind them. The fixed panels stay solid.
- **Phones:** the layout stacks as now, and the on-screen device buttons replace drag and scroll.

## 9. Look

Same tokens and fonts as now. Devices on the monitor are greyscale, drawn with the existing density model (radiopaque lines and markers), so they shade and overlap like everything else. Each colour keeps its one meaning (amber for X-ray and contrast, ECG green for the heart rate, alarm red for unsafe). Motion answers actions: the balloon widens as pressure rises and steps settle into place. No glows, no decorative animation.

## 10. Testing

Each engine piece is a plain module with unit tests written first:
- shelf data and compatibility
- guide fit and engagement states
- the pressure waveform and its damping
- the wire rail model (position, speed limit, branch choice)
- compliance charts and inflation outcomes
- the practice step machine

The tab gets render tests for its panels, a visual check at 1366×768, 1920×1080 and 390 px, and an independent review before each stage goes live.

## 11. Calls I made (please check)

1. Three stages, starting with the shelf and inflation, each live when done.
2. Right radial, 6F sheath and 6F guide fixed for the practice.
3. The practice lesion's position, length and severity (§6).
4. The device list and the illustrative compliance values (§7.1, §7.4).
5. Guide fit, wire and sizing grades from the v1.1 starter rules (§7.5), pending reviewers.
6. Pressure damping as the one guide event; guide back-out with weak support.
7. Keyboard and on-screen controls alongside the mouse, so phones work.
8. Burst is not simulated; going past RBP needs a confirm and is flagged Unsafe.
9. Lesion recoil and stent under-expansion are modelled, with illustrative values (§7.4), so post-dilation has a purpose.
10. Distinct shapes for each guide curve family, with the aortic root redrawn so the ostia sit on its wall (§7.2).
11. The operator calls each inflation target and the learner dials it in from the chart (§7.4).
12. Predilation optional, direct stenting Acceptable; semi-compliant and non-compliant predilation both Best (§7.4).

## 12. Left to the builder

- the exact waveform shape, drag-to-millimetre scale and speed limit
- how the J-tip is drawn
- marker and balloon rendering details within the density model
- layout spacing, the step list's wording, and the panels' animation timings

## 13. Sources

- EuroIntervention Tools & Techniques: guide catheter selection (curve and size by access and aortic root).
- ACC Coronary Interventions Handbook, ch. 1: workhorse wire characteristics.
- Normal coronary diameters by QCA, Indian Heart J 2021: reference diameters (already in the app).
- CIT 2024: lesion preparation, non-compliant predilation at about 1:1.
- Compliance values: illustrative, within the ranges of commonly published semi-compliant, non-compliant and drug-eluting stent charts; reviewers confirm.
