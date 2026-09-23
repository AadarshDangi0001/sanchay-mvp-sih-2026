import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SimulationMetrics } from '../../types/simulation'
import { ChartFrame, ChartLegend, ChartTooltip, GRID, VIZ, yAxisProps } from './chartTheme'

export interface CompareItem {
  id: string
  name: string
  metrics: SimulationMetrics
}

interface MetricDef {
  key: keyof SimulationMetrics
  label: string
  unit: string
  digits: number
  better: 'high' | 'low'
}

export const COMPARE_METRICS: MetricDef[] = [
  { key: 'avgIndoor', label: 'Average indoor temperature', unit: '°C', digits: 1, better: 'high' },
  { key: 'heatLossKWh', label: 'Total heat loss', unit: 'kWh', digits: 1, better: 'low' },
  { key: 'solarGainKWh', label: 'Solar gain', unit: 'kWh', digits: 1, better: 'high' },
  { key: 'comfortHours', label: 'Comfort hours', unit: 'h', digits: 1, better: 'high' },
  { key: 'energyKWh', label: 'Energy requirement', unit: 'kWh', digits: 1, better: 'low' },
]

export function itemColor(i: number) {
  return VIZ[i % VIZ.length]
}

export function ComparisonBars({ items, metric }: { items: CompareItem[]; metric: MetricDef }) {
  const data = items.map((it, i) => ({ name: it.name.length > 16 ? it.name.slice(0, 15) + '…' : it.name, full: it.name, value: +(it.metrics[metric.key] as number).toFixed(metric.digits), i }))
  return (
    <div className="card p-4">
      <div className="text-[13px] font-bold">{metric.label}</div>
      <div className="mb-1 text-[11px] font-medium text-ink-mute">{metric.unit} · {metric.better === 'high' ? 'higher is better' : 'lower is better'}</div>
      <div className="h-[190px]" role="img" aria-label={`${metric.label} comparison`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="i" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tickFormatter={(i) => `#${Number(i) + 1}`} tick={{ fill: '#6b7a90', fontSize: 11 }} />
            <YAxis {...yAxisProps} width={36} />
            <Tooltip cursor={{ fill: '#f1f5fb' }} content={<ChartTooltip title={(l) => data[Number(l)]?.full} format={(v) => `${v.toFixed(metric.digits)} ${metric.unit}`} />} />
            <Bar dataKey="value" name={metric.label} radius={[4, 4, 0, 0]} maxBarSize={38}>
              {data.map((d) => <Cell key={d.i} fill={itemColor(d.i)} />)}
              <LabelList dataKey="value" position="top" className="num" style={{ fontSize: 11, fontWeight: 600, fill: '#3b4a60' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Every axis scaled 0–100 where 100 is the best value in the set. */
export function ComparisonRadar({ items }: { items: CompareItem[] }) {
  const axes = COMPARE_METRICS.filter((m) => m.key !== 'avgIndoor')
  const data = axes.map((m) => {
    const vals = items.map((it) => it.metrics[m.key] as number)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const row: Record<string, number | string> = { metric: m.label.replace('Total ', '').replace(' requirement', '') }
    items.forEach((it, i) => {
      const v = it.metrics[m.key] as number
      const t = hi === lo ? 1 : (v - lo) / (hi - lo)
      row[`s${i}`] = Math.round((m.better === 'high' ? t : 1 - t) * 80 + 20)
    })
    return row
  })
  return (
    <ChartFrame title="Overall profile" subtitle="Each axis is scaled so the outer ring is the best design in the set">
      <ChartLegend items={items.map((it, i) => ({ label: it.name, color: itemColor(i) }))} className="mb-1" />
      <div className="h-[320px]" role="img" aria-label="Radar comparison of designs">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="58%">
            <PolarGrid stroke={GRID} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#3b4a60', fontSize: 11, fontWeight: 600 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {items.map((it, i) => (
              <Radar key={it.id} name={it.name} dataKey={`s${i}`} stroke={itemColor(i)} strokeWidth={2} fill={itemColor(i)} fillOpacity={0.1} />
            ))}
            <Legend content={() => null} />
            <Tooltip content={<ChartTooltip format={(v) => `${v.toFixed(0)} / 100`} />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}
