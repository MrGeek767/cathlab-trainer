# CathLab Trainer

A free browser game that teaches cath lab nurses and technologists angiographic views, equipment and PCI cases.

**Live:** <https://mrgeek767.github.io/cathlab-trainer/>

> Educational simulation, not for clinical use.

Created by Omar M. Noreldin.

## What's in it

- **Angle Trainer:** move the C-arm and watch the angiogram, the 3D heart and the view ratings change together, with right-dominant, left-dominant and codominant anatomy.
- **Contrast runs** with left or right injection.
- **Challenges:** "Show me" (find the best view for a segment) and "Name the segment", in Learner or Exam mode.
- **Cath lab practice:** you assist the operator on a proximal LAD lesion. Pick balloons and stents from the shelf, push them along the wire on the monitor, and inflate to the pressure the operator calls, reading the compliance chart. Each choice gets a grade and a short note with its source.

Coming next: choosing and seating the guide catheter with its pressure trace, steering the wire, and more PCI cases.

## Credits

Base code: [iiviewer (CathLabSimulator)](https://annasrahman.com) by annasrahman.com. Full credits are in [CREDITS.md](CREDITS.md); licences in [LICENSE.md](LICENSE.md).

## Development

```bash
npm ci
npm run dev          # local server
npm test             # unit tests (Vitest)
npm run typecheck    # TypeScript
npm run build        # production build
```

The design and the build plan are in [`docs/superpowers/`](docs/superpowers/).
