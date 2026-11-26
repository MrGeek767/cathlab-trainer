# CathLab Game: Design v1.1

Status: approved by Omar, 25 Nov 2026. Built on the iiviewer repository Omar supplied. (Copy of the Project document "CathLab Game: Design v1.1".)

## 1. Intent

Cath lab nurses and technologists mostly learn angiographic views, equipment, sizing and their own procedural tasks on the job, with real patients. This game gives them a safe place to practise. It is free, runs in a browser, and every scored answer carries a reference.

Omar runs staff education. He wants a view trainer that goes further, into whole procedures: choosing catheters, wires, balloons and stents with the right sizes, and steering the wire with the mouse.

What success looks like:
- a learner can name the view and the segment on a cine frame
- a learner can choose and size the equipment for the three core cases and say why
- a learner performs the nurse/tech tasks correctly: inflation by compliance chart, pressure-trace recognition, ACT, radiation and contrast awareness
- independent reviewers have signed off the answer key
- it opens from one link on a standard hospital PC

## 2. Goals, non-goals, anti-goals

**Goals**
- An angle trainer
- Three procedure cases with device choice, sizing and mouse-driven wire and catheter handling
- Evidence-based, referenced, tiered scoring
- Zero cost, public code, free hosting

**Not in version 1**
- physics-accurate device behaviour
- patient-specific anatomy
- accounts, LMS or training-record integration
- phones and tablets (touch)
- Arabic interface
- multiplayer

**Anti-goals** (a failure even if everything works)
- teaching anything unsafe or out of date
- presenting one operator's preference as the only right answer
- using any asset or code we aren't licensed or permitted to use
- looking like a copy of another product
- needing anything paid
- any patient-identifiable image

## 3. Constraints

- **Cost:** free tools and hosting only. GitHub Free with GitHub Pages; the repository is public (Omar approved). A GitHub Actions workflow builds and publishes the site, which is free for public repositories.
- **Data and code:** only openly licensed material, or material used with permission (iiviewer). Attribution for every CC BY item and credit to iiviewer's author.
- **Platform:** current Chrome or Edge on a typical hospital desktop or laptop, with mouse and keyboard. Must work behind hospital firewalls, so nothing loads from a CDN at runtime (iiviewer's Google Fonts link gets replaced with a self-hosted font).
- **Clinical content:** current guidelines and consensus, each with its date: ESC 2023 ACS, ESC 2024 CCS, EBC 16th consensus, EuroIntervention Tools & Techniques, ACC Coronary Interventions Handbook; for views, Di Mario & Sutaria (Heart 2005) and the JACC CI 2020 CT-derived optimal angles.
- **Review:** independent reviewers and consultants check the answer key before release (Omar).
- **Images:** no cine runs from Omar's own lab (Omar agreed).

## 4. Approaches

| | Approach | Trade-offs | Decision |
|---|---|---|---|
| A1 | Browser game built on **iiviewer** (open-source "CathLabSimulator": React, TypeScript, three.js), extended with procedures, devices and scoring | Saves most of Phase 1: it already has a 3D heart, a coronary tree in three dominance variants, a live fluoro projection, 10 standard views, Di Mario view ratings, a view heat map, a quiz and tests. Its geometry was audited against the literature. Needs a build step (handled by GitHub Actions) | **Chosen** (Omar supplied it, with the author's permission) |
| A2 | The same game written from scratch in plain JavaScript | No dependency on someone else's code, but repeats work iiviewer already did and checked | Not needed: the permission covers a public repository |
| B | Real patient trees from CT datasets (e.g. ImageCAS-X centrelines) | More anatomical variety. Heavy processing; the underlying CT set is non-commercial; Zenodo downloads are blocked from Claude's workspace | Possible later upgrade |
| C | Game engine (Unity or Godot) with physics | Better device feel. Big downloads, slow build-test loop, harder hosting | Rejected |

## 5. What Omar decided

- Browser-based game
- Build on iiviewer; the author's permission covers publishing a modified version in a public repository, with credit (confirmed 25 Nov 2026)
- Public code, hosted free on GitHub Pages (GitHub account MrGeek767)
- Answer key reviewed by independent reviewers and consultants
- Openly available data only
- No local cine runs

## 6. Design

### 6.1 Modes

**Angle Trainer** (iiviewer gives most of this)
- Already in iiviewer:
  - C-arm angle sliders using DICOM sign conventions (+LAO/-RAO, +cranial/-caudal)
  - 10 standard views
  - right-dominant, left-dominant and codominant trees
  - linked 3D heart and live fluoro views
  - a view-quality panel graded on Di Mario's 0-3 scale
  - an optimal-view heat map for any segment
  - a teaching panel and a 15-question view quiz
- We add:
  - contrast cine runs with selective left or right injection
  - a "Show me" challenge: set the C-arm to the best view for a named segment, scored against the accepted angle range
  - a "Name the segment" challenge with SYNTAX/AHA numbers
  - Learner and Exam modes
  - polish to match this game's look

**Read the Film** (Phase 4)
- Runs from the CADICA dataset (CC BY 4.0): which vessel, which view, where the lesion is, roughly how severe. Answers come from the dataset's labels; reviewers confirm the severity bands we show.

**Cases**
- Flow: patient story (history, ECG, vitals), then access, sheath, guide catheter, engagement, wire, crossing, predilation, stent, post-dilation or POT, final shot, debrief.
- Choice steps open the device shelf. Every option has a tier, feedback and a reference.
- Drive steps happen on the live fluoro screen with the mouse: engaging the guide and wiring the vessel.
- Nurse/tech tasks appear inline (6.8).
- One event per case in v1: damped pressure on deep engagement (case 1), no-reflow (case 2), side-branch compromise after the main-vessel stent (case 3).

### 6.2 Anatomy

- **Coronary tree:** iiviewer's hand-built centreline model. It is in patient coordinates (x = patient's left, y = cranial, z = anterior), in cm, with 17 segments in the right-dominant tree (LM, proximal/mid/distal LAD, D1, D2, S1, proximal/distal LCx, OM1, OM2, proximal/mid/distal RCA, PDA, PLV, AM), plus left-dominant and codominant variants. Each segment has a parent, control points (smoothed as Catmull-Rom curves) and start and end radii.
- **What iiviewer's audit found:** the angle conventions, projection maths and image handedness match DICOM and published standards. The centrelines are stylised, so view ratings shown to learners stay the curated Di Mario ones, and the geometry supplies foreshortening and overlap readouts. We keep that rule.
- **3D heart:** iiviewer's Sketchfab "Realistic Human Heart" by neshallads (CC BY 4.0, credited in the app). The Human Reference Atlas heart (CC BY 4.0) stays an option if we later need separate chambers.
- **Vessel sizes:** iiviewer's radii are approximate. We calibrate them to published normal diameters by segment (free full-text sources through the PubMed connector), so the sizing questions use realistic numbers. Reviewers confirm.
- **Lesions:** % diameter stenosis, length and position along a segment, plus thrombus and calcium flags. The renderer narrows the lumen to match; QCA-style readouts are available for sizing questions.
- **Device rails:** the same centrelines, measured by arc length, with parent-child links giving every bifurcation.

### 6.3 Angiogram renderer

- Start from iiviewer's fluoro canvas: projected vessel curves with glow, noise, scanlines and an inverted-LUT option.
- **Add:**
  - selective left or right injection
  - contrast that fills from the ostium, holds and washes out (about 15 frames per second, timed to the heart rate)
  - fluoro (noisy, no contrast) versus cine
  - lumen narrowing at lesions
  - faint spine, ribs and diaphragm
  - simple heart motion that the player can switch off
- **Devices** show radio-opaque: guide catheter, 0.014-inch wire with an opaque tip, balloon markers, faint stent struts.
- Orthographic projection in v1, as iiviewer has it; magnification can come later.

### 6.4 Room view

A simple C-arm, table and beam cone made from our own low-poly shapes, linked to the angles. Phase 4.

### 6.5 Device engine ("rail" model)

- **Guide catheter:** runs along a fixed path from the access site (radial or femoral) to the aortic root. The player rotates and pushes to engage. The curve family (JL, JR, EBU/XB, AL) and size give a fit score for each ostium, depending on the case's aortic root size. A poor fit gives weak support; a deep fit damps the pressure trace.
- **Wire:** its position is a distance in mm along a centreline. Dragging advances or withdraws it, with a speed limit. Scroll or right-drag rotates the tip, and the tip angle against each branch's direction decides which branch it enters. The tip curve and wire category affect crossing: a floppy wire prolapses at a tough lesion, and a stiff tip pushed hard raises the dissection risk. Poor guide support lets the guide back out.
- **Balloons and stents:** delivered over the wire and positioned by their markers against the lesion. An inflation-device widget sets the pressure in atm, and a compliance chart (nominal and rated burst pressure) turns pressure into diameter. Outcomes: undersizing leaves residual stenosis, oversizing risks edge dissection, missing part of the lesion is a geographic miss, and the POT balloon's position is checked against the carina.
- Compliance charts are generic, within typical ranges, and labelled as illustrative.
- Every simplification is listed on the About page.

### 6.6 Cases in v1

1. **Elective PCI, proximal LAD** (tutorial): one focal lesion, right radial, 6F.
2. **Primary PCI, inferior STEMI:** thrombotic occlusion of the mid RCA.
3. **LAD/D1 bifurcation** with a short side-branch lesion (under 10 mm), so provisional stenting with POT is the evidence-based default.

Each case lives in its own data file: patient, ECG, vitals, anatomy variant, lesions, steps, options, tiers and references.

### 6.7 Answer key and scoring

- **Spreadsheet:** one row per option, with case, step, option, tier (Best, Acceptable or Unsafe), points, feedback, reference (short form and URL), guideline and year, and reviewer initials and date. Omar edits it in Excel; a small script converts it for the game.
- **Rule-based items** are calculated rather than listed: stent diameter against the distal reference, stent length against lesion coverage, POT balloon against Finet's law, and inflation pressure against the chart target. The reviewers set the thresholds; placeholders come from the cited sources.
- **Scores:**
  - decisions
  - handling (fluoro time, dose, contrast, complications)
  - nurse/tech tasks

  Each case also has badges. The debrief lists every decision with its tier, feedback and reference.
- **Learner mode** gives hints and immediate explanations. **Exam mode** has no hints and debriefs at the end.

Starter rules (reviewers to confirm):
- Left guide, femoral, normal aorta: EBU 4 or JL4, down to 3.5 or up to 4.5. Large aorta: EBU 4-4.5 or JL5, then Amplatz left for more support. From the right radial, a curve 0.5 smaller. (EuroIntervention Tools & Techniques)
- Workhorse 0.014-inch wire, with 1:1 torque and moderate support, for most lesions; the choice also follows operator familiarity and anatomy. (ACC Coronary Interventions Handbook, ch. 1)
- Bifurcation outside the left main: stepwise layered provisional stenting, with the main-vessel stent across the side branch, then routine POT. (EBC 16th consensus, part I)
- Main-vessel stent sized to the distal main-vessel reference. POT balloon sized by Finet's law: pMV = 0.678 × (dMV + SB). (Darremont 2015; Hoye 2018)
- Primary PCI: no routine thrombus aspiration (Class III, A); radial access by default; DES. (ESC 2023 ACS)
- Complex PCI (left main, true bifurcation, long lesions): imaging guidance recommended. (ESC 2024 CCS)
- Lesion preparation: non-compliant predilation at about 1:1 balloon-to-artery is one accepted approach, scored as a range. (CIT 2024)

### 6.8 Nurse/tech tasks in v1

- **Compliance chart:** given the balloon and the target diameter, set the pressure (within tolerance). Going over rated burst pressure triggers a warning.
- **Pressure trace:** recognise normal, damped and ventricularised traces, and tell the operator.
- **ACT:** check timing after heparin and flag a low ACT before wiring. The target comes from the case ("per local protocol").
- **French-size compatibility** between sheath, guide and devices.
- **Radiation:** fluoro time and air-kerma/DAP meters that rise with steep angles and cine. Tips on collimation, distance, shielding and fluoro versus cine.
- **Contrast:** a volume meter with a case-specific limit (for example, a patient with renal impairment).
- **Vagal and contrast reactions:** recognise and escalate per local protocol. No drug doses in v1.

### 6.9 Interface

```
┌──────────────────────────────┬───────────────┐
│ LIVE FLUORO / CINE           │ DEVICE SHELF  │
│ drag = push/pull             │ Guides   ▸    │
│ scroll = torque              │ Wires    ▸    │
│                              │ Balloons ▸    │
│                              │ Stents   ▸    │
├───────────────┬──────────────┼───────────────┤
│ C-arm pad     │ 3D heart     │ ECG · BP      │
│ LAO 40 CRA 25 │              │ Fluoro · dose │
│ standard views│              │ Contrast (ml) │
└───────────────┴──────────────┴───────────────┘
```

- Main menu: Angle Trainer, Read the Film, Cases, About & References, Settings (sound, motion, difficulty).
- Dark, high-contrast style like cath lab monitors (iiviewer already uses one); large readable text; colour-blind-safe colours; keyboard shortcuts.

### 6.10 Technical

- **iiviewer's stack:** React 19, TypeScript, three.js through react-three-fiber and drei, Vite, Tailwind CSS, Vitest.
- **Setup fixes:**
  - self-host the font (no Google Fonts)
  - set the GitHub Pages base path, including for the heart model's preload link
  - add a GitHub Actions workflow that runs the tests, builds and publishes
- **Code layout** follows iiviewer:
  - `src/components`, `src/data`, `src/utils`, `src/hooks`
  - new folders for devices, cases and scoring
  - `data/` for case files and the converted answer key
  - `tools/` for the spreadsheet converter
- **Tests:**
  - iiviewer's suite: handedness, foreshortening, textbook ratings, dominance variants
  - new unit tests for the rail model, sizing and scoring rules
  - screenshot checks
- **Progress:** saved in the browser (with safe fallbacks); a printable end-of-case report (print to PDF).
- **Targets:** smooth (60 fps) on integrated graphics at 1080p; first load under about 15 MB (iiviewer's heart textures are about 6.5 MB and may be compressed).

### 6.11 Licences and attribution

- **iiviewer code:** used with its author's permission (annasrahman.com) and credited in the app and the README. The repository has no licence file, so the permission's scope decides how it's published.
- **New code:** MIT licence. **Written content:** CC BY 4.0.
- **Attribution page:** Sketchfab heart by neshallads, CADICA and Servier Medical Art (all CC BY 4.0), plus any HRA models if used.
- **Disclaimers:** on every screen, "Educational simulation, not for clinical use."

## 7. Phases

0. **Setup:**
   - create the public repository
   - bring in iiviewer with credit
   - install it, run its tests and check it builds
   - apply the font and base-path fixes and publish it to Pages
   - commit this design and the step-by-step build plan
1. **Angle Trainer:** contrast cine with selective injection, the "Show me" and "Name the segment" challenges, Learner/Exam modes, vessel-size calibration, look and feel.
2. **Device engine:** device shelf, guide engagement, mouse-driven wire on rails, pressure trace, inflation widget.
3. **Cases and scoring:** the three cases, tiered scoring with references, debrief, safety meters.
4. **More content:** Read the Film (CADICA); the room view; a calcified lesion; left main with imaging; complication drills.
5. **Pilot:** reviewer sign-off, a test with 5-10 nurses and techs, fixes, release link.

## 8. Calls Claude made (checked by Omar)

1. Keep iiviewer's stack (React, TypeScript, Vite) rather than rewriting in plain JavaScript. The build runs on GitHub Actions.
2. The device shelf uses generic categories and curve families (EBU/XB, JL, JR, AL; "workhorse 0.014-inch"), with no brands. A "local shelf" file can add brands later.
3. English only in v1.
4. No accounts or training records; progress stays in the browser, with a printable report.
5. Desktop with a mouse, on Chrome or Edge.
6. Neutral branding, with no employer logos, because the code is public.
7. No drug doses; actions say "per local protocol".
8. Right-dominant anatomy first for the cases (all three variants stay in the Angle Trainer).
9. New code MIT, content CC BY 4.0.
10. "CathLab Trainer" as a working name until Omar picks one.
11. Reviewer pack: the answer-key spreadsheet plus a reviewer mode in the game showing every option's tier and reference. Feedback comes back as comments on the sheet, so reviewers don't need GitHub accounts.
12. SYNTAX/AHA segment numbering throughout.
13. Compliance charts are generic, within typical ranges, and labelled as illustrative.
14. Orthographic projection in v1; the room view moves to Phase 4.

## 9. Left to the builder

Visual details and noise settings; exact scoring thresholds until the reviewers set them; fine UI layout; the number of quiz items; sound.

## 10. Open question for Omar (answered)

- Does the iiviewer author's permission cover publishing a modified version in a public GitHub repository, with credit? **Yes** (Omar, 25 Nov 2026). Keep the permission in writing.

## 11. Sources

- iiviewer / CathLabSimulator (repository supplied by Omar; author: https://annasrahman.com), including its Angiographic Correctness Audit
- Sketchfab heart, "Realistic Human Heart" by neshallads (CC BY 4.0): https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089
- HRA releases (heart v1.3, vasculature v1.4, CC BY 4.0): https://github.com/hubmapconsortium/ccf-releases
- CADICA dataset (CC BY 4.0): https://data.mendeley.com/datasets/p9bpx9ctcv/5
- Servier Medical Art (CC BY 4.0): https://smart.servier.com/
- Di Mario & Sutaria, projections with a meaning (Heart 2005): https://heart.bmj.com/content/91/7/968.info
- BJC, optimal angiographic views (trainee guide): https://bjcardio.co.uk/?p=35300
- EuroIntervention, guiding catheters: https://eurointervention.pcronline.com/article/tools-and-techniques-choice-and-use-of-guiding-catheters
- ACC handbook, coronary wires: https://www.acc.org/-/media/Non-Clinical/Files-PDFs-Excel-MS-Word-etc/Membership/Coronary-Interventions-Handbook/Chapter-1_Coronary-Wires.pdf
- EBC 16th consensus, part I: https://pmc.ncbi.nlm.nih.gov/articles/PMC10259243
- Darremont, provisional side-branch stenting: https://eurointervention.pcronline.com/article/technical-aspects-of-the-provisional-side-branch-stenting-strategy/pdf
- Hoye, POT and Finet's law: https://pmc.ncbi.nlm.nih.gov/articles/PMC5808474
- Imaging-guided sizing review: https://pmc.ncbi.nlm.nih.gov/articles/PMC11307675
- ESC 2024 CCS essential messages: https://escardio.org/static-file/Escardio/Guidelines/Products/Essential%20Messages/2024%20EM/Essential%20Messages_2024%20CCS.pdf
- ESC 2023 ACS, imaging IIa (CVIT summary): https://link.springer.com/article/10.1007/s12928-024-01036-y
- Thrombus aspiration, Class III: https://journal.hep.com.cn/HSF/EN/10.31083/HSF49260
- Lesion preparation (CIT 2024): https://citoday.com/articles/2024-may-june/drug-coated-balloons
- GitHub Pages availability: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Prior art, free non-commercial view simulator on real CT: https://github.com/crp372/coronary-view-simulator


> 26 Nov: the owner's footer credit (Omar M. Noreldin) replaced the heart-model credit in the footer; everyone else is credited in About, the base code as "Base code". The app names no other product.
