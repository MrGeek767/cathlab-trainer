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

- Every structure renders as X-ray density into a half-float buffer, added up along the beam: a facing-based profile gives vessels a dense centre and soft edges, and crossings come out darker.
- A post pass turns density into brightness with an exposure curve (Beer–Lambert), then adds quantum noise (stronger in fluoro than in cine), a slight blur and a darker rim. Display inversion happens here too, so overlay text is never inverted.
- New structures: a faint cardiac shadow from the 3D heart model, and faint ribs sloping down from the spine. The spine and diaphragm stay.
- The heart beats: vessels and the heart move with a simple cardiac cycle (systole about 30% of the beat). There is a switch to turn it off, and it starts off when the computer asks for reduced motion.
- Cine runs at 15 frames per second. Contrast timing is counted in beats (fill 1.5, hold 3, washout 2), so a faster heart gives a shorter run. The overlay shows a frame counter.
- Overlay, like a real system: a training-patient label, C-arm angles, mode and frame rate, frame counter, heart rate, and an amber X-ray lamp during runs.

## Real fluoro

- **Road map (default while learning):** vessels always drawn.
- **Real fluoro:** vessels show only where contrast is during a run; the rest of the image is the patient.
- **Exam mode** always uses real fluoro. In Name the segment, injections loop on the target's side so the target can be read.

## Motion

Motion answers actions. Tabs slide their indicator, panels fade in, feedback appears, the results score counts up, and the C-arm swings smoothly. There are no decorative entrance effects. Everything except the C-arm swing is off under prefers-reduced-motion.
