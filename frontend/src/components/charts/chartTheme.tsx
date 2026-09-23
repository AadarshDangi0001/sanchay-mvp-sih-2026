import type { ReactNode } from 'react'

/** Categorical slots from the validated reference palette, in fixed order. */
export const VIZ = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'] as const
export const GRID = '#e6ebf3'
export const AXIS = '#6b7a90'
export const axisProps = {
  tickLine: false as const,
  axisLine: { stroke: '#cbd5e1' },
  tick: { fill: AXIS, fontSize: 11 },
}
export const yAxisProps = {
  tickLine: false as const,
  axisLine: false as const,
  tick: { fill: AXIS, fontSize: 11 },
  width: 44,
}

interface TipPayload {
  name?: string | number
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

export interface ChartTooltipProps {
  active?: boolean
  payload?: TipPayload[]
  label?: string | number
  title?: (label: string | number | undefined, payload: TipPayload[]) => ReactNode
  format?: (value: number, name: string) => string
}

export function ChartTooltip({ active, payload, label, title, format }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="pointer-events-none rounded-xl border border-line bg-white px-3 py-2.5 shadow-pop">
      <div className="num mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
        {title ? title(label, payload) : label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5 text-xs font-semibold text-ink">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
          <span className="text-ink-soft">{p.name}</span>
          <span className="num ml-auto pl-4">{format ? format(Number(p.value), String(p.name)) : Number(p.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

export interface LegendItem {
  label: string
  color: string
  dashed?: boolean
  swatch?: 'square' | 'line'
}

export function ChartLegend({ items, className = '' }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          {it.swatch === 'line' ? (
            <span className="h-[3px] w-4 rounded-full" style={{ background: it.color }} />
          ) : (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  )
}

export function ChartFrame({
  title, subtitle, legend, children, action, className = '',
}: { title: string; subtitle?: string; legend?: LegendItem[]; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-ink-mute">{subtitle}</p>}
        </div>
        {action}
      </div>
      {legend && legend.length > 1 && <ChartLegend items={legend} className="mb-2" />}
      {children}
    </section>
  )
}

/** Round-number tick positions for a [lo, hi] range. */
export function niceTicks(lo: number, hi: number, target = 6): number[] {
  const raw = (hi - lo) / target
  const step = [1, 2, 4, 5, 10, 20, 50, 100, 200, 500].find((s) => s >= raw) ?? 1000
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v)
  return out
}
