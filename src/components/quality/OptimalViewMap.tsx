import { useMemo, useRef, useEffect, useState } from 'react'
import type { ArterySegment } from '@/types/anatomy'
import { interpolateSegmentScore, scoreToRating } from '@/data/quality-matrix'
import { RATING_WORD } from '@/components/ui/rating'
import { formatView } from '@/utils/format-view'

interface OptimalViewMapProps {
  segments: ArterySegment[]
  segmentId: string | null
  raoLao: number
  cranialCaudal: number
  onPick: (raoLao: number, cranialCaudal: number) => void
}

// Angle domain (matches the app sliders)
const RAO_MIN = -90, RAO_MAX = 90
const CC_MIN = -45, CC_MAX = 45
// Heat-map grid resolution (foreshortening is smooth, so a coarse grid suffices)
const GRID_W = 60
const GRID_H = 30
const CANVAS_W = 300
const CANVAS_H = 150
// One hue, dim (poor view) to bright (ideal view), so colour-blind readers see the same order.
const DIM = [14, 59, 42]
const BRIGHT = [75, 231, 154]
const shade = (t: number) => {
  const k = Math.max(0, Math.min(1, t))
  const [r, g, b] = DIM.map((d, i) => Math.round(d + ((BRIGHT[i] ?? d) - d) * k))
  return `rgb(${r}, ${g}, ${b})`
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

/**
 * Optimal-view (best-projection) map for one coronary segment.
 *
 * Sweeps the entire (RAO/LAO × CRAN/CAUD) gantry plane and colours each angle by
 * the segment's view quality (green = ideal, red = not recommended), marks the
 * best view (✦) and the current view (＋), and lets the user click to jump there.
 *
 * The quality field is the interpolated Di Mario & Sutaria reference (the same
 * source that drives the segment chips), so the optimum the map points to is the
 * published best projection for that segment — not an artefact of the stylised
 * centreline geometry.
 */
export function OptimalViewMap({ segments, segmentId, raoLao, cranialCaudal, onPick }: OptimalViewMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

  // Build the quality grid for the selected segment (recompute only when it changes).
  const grid = useMemo(() => {
    if (!segmentId) return null
    const seg = segments.find(s => s.id === segmentId)
    if (!seg) return null

    const values = new Float32Array(GRID_W * GRID_H) // visibility 0..1 (score/3)
    let best = { v: -Infinity, rl: 0, cc: 0 }
    for (let gy = 0; gy < GRID_H; gy++) {
      const cc = lerp(CC_MAX, CC_MIN, gy / (GRID_H - 1)) // top = cranial(+), bottom = caudal(−)
      for (let gx = 0; gx < GRID_W; gx++) {
        const rl = lerp(RAO_MIN, RAO_MAX, gx / (GRID_W - 1))
        const vis = interpolateSegmentScore(segmentId, rl, cc) / 3 // 0 (−) … 1 (+++)
        values[gy * GRID_W + gx] = vis
        if (vis > best.v) best = { v: vis, rl, cc }
      }
    }
    return { values, best, name: seg.name }
  }, [segments, segmentId])

  const [pointer, setPointer] = useState<{ rl: number; cc: number } | null>(null)

  // Canvas backing-store size is set on the JSX element (below) so it is correct on
  // the first paint, with no blank frame. This effect only draws.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !grid) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    const cw = CANVAS_W / GRID_W
    const ch = CANVAS_H / GRID_H
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        ctx.fillStyle = shade(grid.values[gy * GRID_W + gx]!)
        ctx.fillRect(gx * cw, gy * ch, cw + 0.5, ch + 0.5)
      }
    }

    // Guide lines at AP and straight.
    const xAt = (rl: number) => ((rl - RAO_MIN) / (RAO_MAX - RAO_MIN)) * CANVAS_W
    const yAt = (cc: number) => ((CC_MAX - cc) / (CC_MAX - CC_MIN)) * CANVAS_H
    ctx.strokeStyle = 'rgba(233, 240, 247, 0.22)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(xAt(0), 0); ctx.lineTo(xAt(0), CANVAS_H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, yAt(0)); ctx.lineTo(CANVAS_W, yAt(0)); ctx.stroke()

    // Markers carry shape, not just colour: a star for the best view, a ring for the C-arm.
    const star = (x: number, y: number) => {
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 8 : 3.2
        const a = (Math.PI / 4) * i - Math.PI / 2
        ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
      }
      ctx.closePath()
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#0B1826'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fill()
    }
    star(xAt(grid.best.rl), yAt(grid.best.cc))
    ctx.beginPath()
    ctx.arc(xAt(raoLao), yAt(cranialCaudal), 6, 0, Math.PI * 2)
    ctx.lineWidth = 4
    ctx.strokeStyle = '#0B1826'
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#4C9BE8'
    ctx.stroke()
  }, [grid, raoLao, cranialCaudal, dpr])

  const angleAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    return { rl: Math.round(lerp(RAO_MIN, RAO_MAX, px)), cc: Math.round(lerp(CC_MAX, CC_MIN, py)) }
  }

  if (!grid || !segmentId) {
    return (
      <p className="rounded-lg bg-room/60 px-3 py-4 text-center text-sm text-ink-soft ring-1 ring-line">
        Point at a segment in the list above to map where it is seen best.
      </p>
    )
  }

  const readout = pointer
    ? `${formatView(pointer.rl, pointer.cc)}: ${RATING_WORD[scoreToRating(interpolateSegmentScore(segmentId, pointer.rl, pointer.cc))].toLowerCase()} view`
    : `Best: ${formatView(grid.best.rl, grid.best.cc)}. Click the map to move the C-arm there.`

  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-sm font-bold text-ink">Where {grid.name} is seen best</figcaption>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-1.5 text-xs text-ink-faint">
        <span />
        <span className="text-center">Cranial</span>
        <span />
        <span>RAO</span>
        <canvas
          ref={canvasRef}
          width={CANVAS_W * dpr}
          height={CANVAS_H * dpr}
          onClick={e => {
            const { rl, cc } = angleAt(e)
            onPick(rl, cc)
          }}
          onMouseMove={e => setPointer(angleAt(e))}
          onMouseLeave={() => setPointer(null)}
          style={{ width: '100%', maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, cursor: 'crosshair' }}
          className="justify-self-center rounded-md ring-1 ring-line"
          aria-label={`View quality map for ${grid.name}. Best view ${formatView(grid.best.rl, grid.best.cc)}.`}
        />
        <span>LAO</span>
        <span />
        <span className="text-center">Caudal</span>
        <span />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="min-h-[1.15rem] text-xs text-ink-soft" aria-live="polite">{readout}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-faint">
          Poor
          <span aria-hidden className="h-2 w-14 rounded-full" style={{ background: `linear-gradient(90deg, ${shade(0)}, ${shade(1)})` }} />
          Ideal
        </span>
      </div>
    </figure>
  )
}
