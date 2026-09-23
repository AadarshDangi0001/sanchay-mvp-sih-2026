import { useEffect, useRef } from 'react'
import type { CloudPoint } from '../../types/simulation'

interface Props {
  points: CloudPoint[]
  baseline?: { x: number; y: number }
  picks?: { x: number; y: number; n: number }[]
  maxY: number
  scanning?: boolean
  height?: number
}

/** Scatter of every evaluated configuration: energy requirement (x) vs comfort hours (y). */
export function ConfigCloud({ points, baseline, picks = [], maxY, scanning, height = 400 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const box = wrap.current
    if (!canvas || !box) return
    let raf = 0
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = box.clientWidth
      const h = height
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      const g = canvas.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const pad = { l: 46, r: 16, t: 14, b: 40 }
      const iw = w - pad.l - pad.r
      const ih = h - pad.t - pad.b
      // Clip the x-axis at the 92nd percentile so a few terrible outliers don't crush the interesting region.
      const sorted = points.map((p) => p.x).sort((a, b) => a - b)
      const p92 = sorted.length ? sorted[Math.floor(sorted.length * 0.92)] : 5
      const keep = [p92, baseline?.x ?? 0, ...picks.map((k) => k.x)]
      const maxX = Math.max(5, Math.ceil(Math.max(...keep) * 1.08))
      const X = (v: number) => pad.l + (Math.min(v, maxX) / maxX) * iw
      const Y = (v: number) => pad.t + ih - (v / maxY) * ih

      g.font = '11px "JetBrains Mono", ui-monospace, monospace'
      g.fillStyle = '#6b7a90'
      g.strokeStyle = '#e6ebf3'
      g.lineWidth = 1
      g.textAlign = 'right'
      const yStep = [1, 2, 3, 4, 6, 8].find((st) => maxY / st <= 6) ?? 8
      for (let v = 0; v <= maxY + 1e-6; v += yStep) {
        g.beginPath(); g.moveTo(pad.l, Y(v)); g.lineTo(w - pad.r, Y(v)); g.stroke()
        g.fillText(v.toFixed(0), pad.l - 8, Y(v) + 4)
      }
      g.textAlign = 'center'
      for (let i = 0; i <= 5; i++) {
        const v = (maxX / 5) * i
        g.fillText(v.toFixed(0), X(v), h - pad.b + 16)
      }
      g.fillStyle = '#3b4a60'
      g.font = '600 11px Manrope, system-ui, sans-serif'
      g.fillText('Energy requirement to hold comfort (kWh) →', pad.l + iw / 2, h - 6)
      g.save(); g.translate(12, pad.t + ih / 2); g.rotate(-Math.PI / 2); g.fillText('Comfort hours →', 0, 0); g.restore()

      // ideal corner hint
      g.fillStyle = 'rgba(27,175,122,0.07)'
      g.fillRect(pad.l, pad.t, iw * 0.3, ih * 0.35)

      for (const p of points) {
        if (p.pareto) continue
        g.fillStyle = 'rgba(91,147,244,0.38)'
        g.beginPath(); g.arc(X(p.x), Y(p.y), 2.4, 0, Math.PI * 2); g.fill()
      }
      const front = points.filter((p) => p.pareto).sort((a, b) => a.x - b.x)
      if (front.length) {
        g.strokeStyle = '#1d55d6'; g.lineWidth = 1.6; g.beginPath()
        front.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))))
        g.stroke()
        for (const p of front) { g.fillStyle = '#1d55d6'; g.beginPath(); g.arc(X(p.x), Y(p.y), 3.4, 0, Math.PI * 2); g.fill() }
      }
      if (baseline) {
        const bx = X(baseline.x), by = Y(baseline.y)
        g.strokeStyle = '#eb6834'; g.lineWidth = 2.5
        g.beginPath(); g.moveTo(bx - 6, by - 6); g.lineTo(bx + 6, by + 6); g.moveTo(bx + 6, by - 6); g.lineTo(bx - 6, by + 6); g.stroke()
        g.fillStyle = '#c2410c'; g.font = '700 11px Manrope, sans-serif'; g.textAlign = 'left'
        g.fillText('Your design', bx + 10, by - 8)
      }
      for (const k of picks) {
        g.fillStyle = '#06b6d4'; g.strokeStyle = '#fff'; g.lineWidth = 2.5
        g.beginPath(); g.arc(X(k.x), Y(k.y), 11, 0, Math.PI * 2); g.fill(); g.stroke()
        g.fillStyle = '#fff'; g.font = '800 12px "JetBrains Mono", monospace'; g.textAlign = 'center'
        g.fillText(String(k.n), X(k.x), Y(k.y) + 4)
      }
      if (scanning) {
        const t = (performance.now() / 1400) % 1
        const sx = pad.l + t * iw
        g.fillStyle = 'rgba(6,182,212,0.10)'
        g.fillRect(sx - 40, pad.t, 40, ih)
        g.fillStyle = 'rgba(6,182,212,0.7)'
        g.fillRect(sx - 1, pad.t, 2, ih)
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); draw() })
    ro.observe(box)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [points, baseline, picks, maxY, scanning, height])

  return (
    <div ref={wrap} className="w-full" role="img" aria-label="Scatter plot of evaluated configurations">
      <canvas ref={ref} />
    </div>
  )
}
