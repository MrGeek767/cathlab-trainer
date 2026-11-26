# Realism and interface pass: design note

25 Nov 2026. Follows Phase 1 (v0.1.0). Implements the parts of Design v1.1 §6.3 (angiogram renderer) and §6.9 (interface) that Phase 1 left out.

## What Omar asked for

"Make it more realistic and enhance UI size. Make it perfect, with good animations and clear tabs and colours."

**His decision:** the road map (vessels always drawn) stays on while learning. A "Real fluoro" switch shows vessels only while contrast flows, and Exam mode always uses real fluoro. He left the rest to the builder.

## Layout

The live angiogram is the main monitor. It sits in the centre column, square, as tall as the window allows: about 620 px at 1366×768, up from about 150. The left column is the C-arm pad: rotation and angulation, standard views, contrast and dominance. The right column holds the 3D heart as a reference monitor, with the active tab's content below it: Explore (view quality, best-view map and an arteries filter), Learn, Quiz and Challenges. In Phase 2 the device shelf goes in the right column. Below 1024 px wide the columns stack, monitor first.

The 3D heart sits on the right because the C-arm pad alone uses most of a laptop screen's height. With the heart above the controls, the pad would scroll and the inject button would fall off the bottom.

```
┌ CathLab Trainer · tabs: Explore  Learn  Quiz  Challenges ········· About ┐
├──────────────┬────────────────────────────────────┬──────────────────────┤
│ C-arm pad    │ display toolbar                    │ 3D heart (reference) │
│ angles       │ ┌────────────────────────────────┐ ├──────────────────────┤
│ views        │ │   live fluoro / cine           │ │ tab content          │
│ contrast     │ │   (square, max size)           │ │ (scrolls)            │
│ dominance    │ └────────────────────────────────┘ │                      │
├──────────────┴────────────────────────────────────┴──────────────────────┤
│ disclaimer and attribution                                                │
└───────────────────────────────────────────────────────────────────────────┘
```

## Colour and type

Colour carries meaning:

| Token | Hex | Meaning |
|---|---|---|
| room | #0B1826 | background, like a dim control room |
| panel | #11233A | panels |
| drape | #4C9BE8 | your selection: active tab, chosen option, focus |
| x-ray | #FFB21A | X-ray on: lights during a contrast run |
| ecg | #39D98A | heart rate |
| alarm | #FF6B5E | wrong answer, always with ✗ |

Arteries use one colour per territory, the same in every view: LAD orange #E76624, LCx blue #338CED, RCA aqua #00A888. These three pass every pairing in the dataviz palette validator, for normal and simulated colour-blind vision, against the dark panels. No fourth hue passes alongside them, so the left main (the short trunk between LAD and LCx) is a neutral light grey, #C9D3DE. The diagram view therefore uses a dark background too, and it labels every vessel. The view-quality map uses a single green hue from dim (poor) to bright (ideal), never a red-to-green rainbow.

Type: Atkinson Hyperlegible (built for legibility) for all reading text, at 15 px and up. Barlow Condensed, an instrument-panel face, for the monitor overlay and angle readouts, with tabular figures. Both are self-hosted. Labels are sentence case; only the monitor overlay uses capitals, because real systems do.

## The angiogram

- Every structure renders as X-ray density into half-float buffers. A post pass turns density into brightness with an exposure curve (Beer–Lambert) through a display window, then adds quantum noise (stronger in fluoro than in cine, new every 1/15 s), a slight blur and a darker rim. Display inversion happens here too, so overlay text is never inverted.
- Vessels are drawn at their real width (QCA sizes). Contrast density is the beam's path through a round lumen: 2r across the middle of a vessel lying across the beam, lengthening by 1/sin(angle) as the vessel turns toward the beam (capped at about 2.9 diameters), so foreshortened segments look denser, as they do in the lab.
- Two vessel passes: the front pass keeps the nearest vessel at each pixel, so joints and branch origins are not counted twice; the behind pass adds vessels lying more than 5 mm behind it, so crossing vessels darken where they overlap.
- Each artery is drawn along one smooth centre line through its segments (proximal, mid and distal), so there are no kinks or density steps at the joints; measurements still use each segment's own spline. Tubes overlap slightly at their ends to close seams.
- Body: a cardiac silhouette (an ellipsoid fitted to the coronary tree by principal components, with gentle bulges), the aortic root and ascending aorta, posterior ribs sloping down from the spine, the spine with disc spaces, and the diaphragm domes. The 3D model's own shape was tried first and dropped: its valves and great-vessel walls show through, which an angiogram never does.
- A 6 French guide catheter sits in the coronary being injected and runs up the ascending aorta.
- The heart beats (70 bpm): systole is about a third of the beat, then rapid relaxation and rest. The heart contracts toward a pivot near the apex: the base descends 12%, the walls draw in 8%, with 5° of twist. The fluoro image steps at 15 frames a second; the 3D model moves smoothly. A Motion switch turns it off, and it starts off under reduced motion.
- Cine runs at 15 frames per second with a frame counter. Contrast timing is counted in beats (fill 1.5, hold 3, washout 2) and follows coronary flow, which slows in systole (by 70% on the left, 35% on the right), so the contrast column surges forward with each diastole.
- Overlay, like a real system: a training-patient label, dominance, C-arm angles, mode and frame rate, frame counter, heart rate, a sweeping ECG trace in step with the motion, and an amber X-ray lamp during runs.

## Real fluoro

- **Road map (default while learning):** vessels always drawn.
- **Real fluoro:** vessels show only where contrast is during a run; the rest of the image is the patient.
- **Exam mode** always uses real fluoro, with the image and vessel controls locked (a lock icon says why). In Name the segment, injections loop on the target's side so the target can be read; the target is twice as dense and the other vessels fade to 0.3.
- Between runs the monitor shows a short hint to inject; Show me in real fluoro says the same in its panel.

## Motion

Motion answers actions. Tabs slide their indicator, panels fade in, feedback appears, the results score counts up, and the C-arm swings smoothly. There are no decorative entrance effects. Everything except the C-arm swing is off under prefers-reduced-motion.

## After the final review (26 Nov)

An independent review of the whole branch found three problems, all fixed with tests: printed results came out blank (the print copy now has no animation and dark ink), picking the other coronary during a real-fluoro question left it blank (the question now drives the injection side and locks the control), and phones lost three of the five header controls (tabs are icon-only below 768 px, the title text hides, names stay for screen readers).

Calls made on the owner's behalf while he was away:

- **Labels switch.** It now always shows what the monitor does: locked on in Learn, locked off while a question or an exam is on screen, hidden with the diagram (which always names its segments).
- **Exams hide every name**, hover included, in Show me as well as Name the segment. An exam tests the learner, so the screen must not name the vessels.
- **Guide catheter motion.** Only the engaged tip follows the heart; the shaft fades to still within 5 cm, like the aortic shadow around it.
- **Arteries filter.** In Explore it steps aside during a run, so injecting the coronary the filter hides still shows it.
- **Overlap readout.** Fixing the tube width (vessels were drawn 1.8 times too wide) also tightened the overlap check in the quality list, which uses 3 × the true radius. About half the segment-view overlap lists changed (at AP the left main is no longer flagged against the proximal RCA). The new lists are physically consistent, so they stay. The ratings, Show me scoring and the best-view map use the Di Mario table and did not change.
- **Robustness.** Density buffers fall back to 8-bit on graphics cards that can't draw into half floats (the densest vessels clip, but the image shows). The monitor renders at no more than 1.5 device pixels per pixel.

Left for later (minor): hover state can go stale on a moving vessel until the pointer moves; the fluoro pipeline renders every display frame though the image changes 15 times a second; under reduced motion the still ECG doesn't redraw when the window is resized; some 13 px secondary text, Title Case labels and alarm-red text without a ✗ remain in the quiz and Learn panels; small nits (render-target rounding, uniforms written during render, a stale comment in the best-view map).
