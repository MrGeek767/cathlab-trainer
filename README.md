# CathLab Trainer

A free browser game that teaches cath lab nurses and technologists angiographic views, equipment and PCI cases.

**Live:** <https://mrgeek767.github.io/cathlab-trainer/>

> Educational simulation, not for clinical use.
> CathLab Trainer is an independent project and is not affiliated with AngioView.

## What's in it

- **Angle Trainer:** move the C-arm and watch the angiogram, the 3D heart and the view ratings change together, with right-dominant, left-dominant and codominant anatomy.
- **Contrast runs** with left or right injection.
- **Challenges:** "Show me" (find the best view for a segment) and "Name the segment", in Learner or Exam mode.

Coming next: the device engine (guide catheters, wires, balloons, stents) and three PCI cases with referenced, tiered scoring.

## Built on

[iiviewer](https://annasrahman.com) by its author, used and modified with permission. See [CREDITS.md](CREDITS.md) and [LICENSE.md](LICENSE.md).

## Development

```bash
npm ci
npm run dev          # local server
npm test             # unit tests (Vitest)
npm run typecheck    # TypeScript
npm run build        # production build
```

The design and the build plan are in [`docs/superpowers/`](docs/superpowers/).
