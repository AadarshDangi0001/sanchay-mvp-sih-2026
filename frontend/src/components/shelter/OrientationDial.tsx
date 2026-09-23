import { useMemo, useRef } from 'react'
import { DEG, bearingLabel } from '../../utils/geometry'
import { sunPosition } from '../../utils/thermal'

interface Props {
  value: number
  onChange: (deg: number) => void
  latitude: number
  dayOfYear: number
  size?: number
}

/** Draggable compass. The amber arc is where the sun travels on the design day; the cyan edge is the glazed front. */
export function OrientationDial({ value, onChange, latitude, dayOfYear, size = 168 }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const c = size / 2
  const r = size / 2 - 22

  const arc = useMemo(() => {
    const pts: [number, number][] = []
    for (let h = 3; h <= 21; h += 0.25) {
      const s = sunPosition(latitude, dayOfYear, h)
      if (s.altitude > 0) pts.push([s.azimuth, s.altitude])
    }
    if (pts.length < 2) return null
    const at = (az: number, rr: number) => [c + Math.sin(az) * rr, c - Math.cos(az) * rr]
    const d = pts.map(([az, alt], i) => {
      const rr = r - 8 - (1 - Math.sin(alt)) * 0 // keep on one ring
      const [x, y] = at(az, rr)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
    return { d, rise: at(pts[0][0], r - 8), set: at(pts[pts.length - 1][0], r - 8) }
  }, [latitude, dayOfYear, c, r])

  const setFromEvent = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    let deg = (Math.atan2(dx, -dy) / DEG + 360) % 360
    if (!e.shiftKey) deg = Math.round(deg / 5) * 5 % 360
    onChange(Math.round(deg))
  }

  // Shelter glyph: a 2:1 footprint rotated so the cyan edge (front) points along `value`.
  const w = r * 0.62
  const h = r * 0.4
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="touch-none select-none"
      onPointerDown={(e) => {
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        setFromEvent(e)
      }}
      onPointerMove={(e) => e.buttons === 1 && setFromEvent(e)}
      role="slider"
      aria-label="Orientation"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={value}
      aria-valuetext={`${value}° ${bearingLabel(value)}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange((value + (e.shiftKey ? 15 : 1)) % 360)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange((value - (e.shiftKey ? 15 : 1) + 360) % 360)
      }}
    >
      <circle cx={c} cy={c} r={r + 12} fill="#f8fafd" stroke="#dfe7f3" />
      <circle cx={c} cy={c} r={r} fill="white" stroke="#cbd8ec" strokeDasharray="2 4" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = i * 15 * DEG
        const long = i % 6 === 0
        const r0 = r + 12
        const r1 = r + (long ? 3 : 7)
        return <line key={i} x1={c + Math.sin(a) * r0} y1={c - Math.cos(a) * r0} x2={c + Math.sin(a) * r1} y2={c - Math.cos(a) * r1} stroke={long ? '#5b93f4' : '#c4d3ea'} strokeWidth={long ? 2 : 1} />
      })}
      {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([t, a]) => (
        <text key={t} x={c + Math.sin((a as number) * DEG) * (r - 10)} y={c - Math.cos((a as number) * DEG) * (r - 10)} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" className="num" fill={t === 'N' ? '#ef4444' : '#1a44b0'}>
          {t}
        </text>
      ))}
      {arc && (
        <>
          <path d={arc.d} fill="none" stroke="#f0a500" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <circle cx={arc.rise[0]} cy={arc.rise[1]} r="3.5" fill="#f0a500" />
          <circle cx={arc.set[0]} cy={arc.set[1]} r="3.5" fill="#f0a500" />
        </>
      )}
      <g transform={`rotate(${value - 180} ${c} ${c})`} style={{ transition: 'transform 60ms linear' }}>
        <rect x={c - h / 2} y={c - w / 2} width={h} height={w} rx="3" fill="#dbe8ff" stroke="#1d55d6" strokeWidth="2" />
        {/* front (glazed) edge sits toward +y in this frame, i.e. the bearing after the rotation */}
        <line x1={c - h / 2 + 1} y1={c + w / 2} x2={c + h / 2 - 1} y2={c + w / 2} stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" />
        <path d={`M${c} ${c + w / 2 + 8} l5 8 h-10z`} fill="#06b6d4" />
      </g>
      <circle cx={c} cy={c} r="2.5" fill="#1d55d6" />
    </svg>
  )
}
