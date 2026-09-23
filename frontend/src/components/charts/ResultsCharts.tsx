import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { HourlyResult, LossKey } from '../../types/simulation'
import { clock } from '../../utils/format'
import { ChartFrame, ChartTooltip, GRID, VIZ, axisProps, niceTicks, yAxisProps } from './chartTheme'

export const LOSS_LABELS: Record<LossKey, string> = {
  walls: 'Walls', roof: 'Roof', floor: 'Floor', windows: 'Windows', door: 'Door', ventilation: 'Ventilation',
}
export const LOSS_ORDER: LossKey[] = ['walls', 'roof', 'floor', 'windows', 'door', 'ventilation']
export const LOSS_COLOR: Record<LossKey, string> = {
  walls: VIZ[0], roof: VIZ[1], floor: VIZ[2], windows: VIZ[3], door: VIZ[4], ventilation: VIZ[5],
}

const xTicks = (rows: HourlyResult[]) => {
  const hs = rows.map((r) => r.hour)
  const start = Math.ceil(Math.min(...hs))
  return { domain: [Math.min(...hs), Math.max(...hs)] as [number, number], ticks: Array.from({ length: 12 }, (_, i) => start + i * 2).filter((h) => h <= Math.max(...hs)) }
}

export function IndoorOutdoorChart({
  rows, comfortMin, comfortMax, marker, height = 280,
}: { rows: HourlyResult[]; comfortMin: number; comfortMax: number; marker?: number; height?: number }) {
  const x = xTicks(rows)
  const all = rows.flatMap((r) => [r.indoorTemp, r.outdoorTemp]).concat([comfortMin, comfortMax])
  const yDomain: [number, number] = [Math.floor(Math.min(...all) / 2) * 2 - 2, Math.ceil(Math.max(...all) / 2) * 2 + 2]
  return (
    <ChartFrame
      title="Indoor vs outdoor temperature"
      subtitle="Hourly air temperature with the comfort band shaded"
      legend={[
        { label: 'Indoor', color: VIZ[0], swatch: 'line' },
        { label: 'Outdoor', color: VIZ[1], swatch: 'line' },
        { label: `Comfort ${comfortMin}–${comfortMax} °C`, color: '#c9f0e2' },
      ]}
    >
      <div style={{ height }} role="img" aria-label="Indoor versus outdoor temperature by hour">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <ReferenceArea y1={comfortMin} y2={comfortMax} fill="#1baf7a" fillOpacity={0.12} stroke="none" />
            <XAxis dataKey="hour" type="number" domain={x.domain} ticks={x.ticks} tickFormatter={(h) => clock(h)} {...axisProps} />
            <YAxis {...yAxisProps} domain={yDomain} ticks={niceTicks(yDomain[0], yDomain[1])} allowDataOverflow tickFormatter={(v) => `${v}°`} />
            <Tooltip cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} content={<ChartTooltip title={(l) => clock(Number(l))} format={(v) => `${v.toFixed(1)} °C`} />} />
            {marker !== undefined && <ReferenceLine x={marker} stroke="#0b1a2f" strokeDasharray="4 3" />}
            <Line type="monotone" dataKey="indoorTemp" name="Indoor" stroke={VIZ[0]} strokeWidth={2.2} dot={false} activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="outdoorTemp" name="Outdoor" stroke={VIZ[1]} strokeWidth={2.2} dot={false} activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

/** Solar radiation and solar gain use different units, so they sit in stacked panels rather than on twin axes. */
export function SolarChart({ rows, marker }: { rows: HourlyResult[]; marker?: number }) {
  const x = xTicks(rows)
  const panel = (key: 'solarRadiation' | 'solarGain', name: string, unit: string, color: string, bottom: boolean) => (
    <div className={bottom ? 'mt-3 h-[150px]' : 'h-[118px]'}>
      <div className="num mb-0.5 ml-11 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">{name} · {unit}</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} syncId="solar" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="hour" type="number" domain={x.domain} ticks={x.ticks} tickFormatter={(h) => clock(h)} hide={!bottom} {...axisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} content={<ChartTooltip title={(l) => clock(Number(l))} format={(v) => `${v.toFixed(0)} ${unit}`} />} />
          {marker !== undefined && <ReferenceLine x={marker} stroke="#0b1a2f" strokeDasharray="4 3" />}
          <Area type="monotone" dataKey={key} name={name} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.14} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
  return (
    <ChartFrame
      title="Solar radiation & solar gain"
      subtitle="What the sky delivers vs. what actually enters the shelter"
      legend={[{ label: 'Solar radiation (horizontal)', color: VIZ[3] }, { label: 'Solar gain into shelter', color: VIZ[1] }]}
    >
      <div role="img" aria-label="Solar radiation and solar gain by hour">
        {panel('solarRadiation', 'Solar radiation', 'W/m²', VIZ[3], false)}
        {panel('solarGain', 'Solar gain', 'W', VIZ[1], true)}
      </div>
    </ChartFrame>
  )
}

export function HeatLossChart({ lossKWh }: { lossKWh: Record<LossKey, number> }) {
  const total = LOSS_ORDER.reduce((s, k) => s + lossKWh[k], 0) || 1
  const data = LOSS_ORDER.map((k) => ({ key: k, name: LOSS_LABELS[k], kwh: +lossKWh[k].toFixed(2), pct: (lossKWh[k] / total) * 100 })).sort((a, b) => b.kwh - a.kwh)
  return (
    <ChartFrame title="Heat loss by component" subtitle="Total energy lost through each path over the simulated period (kWh)">
      <div className="h-[280px]" role="img" aria-label="Heat loss by component">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 84, left: 4, bottom: 0 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}`} />
            <YAxis type="category" dataKey="name" width={82} tickLine={false} axisLine={false} tick={{ fill: '#3b4a60', fontSize: 12, fontWeight: 600 }} />
            <Tooltip cursor={{ fill: '#f1f5fb' }} content={<ChartTooltip title={(l) => String(l)} format={(v) => `${v.toFixed(2)} kWh`} />} />
            <Bar dataKey="kwh" name="Heat loss" radius={[0, 4, 4, 0]} maxBarSize={26}>
              {data.map((d) => <Cell key={d.key} fill={LOSS_COLOR[d.key as LossKey]} />)}
              <LabelList
                dataKey="kwh"
                position="right"
                content={(p) => {
                  const { x, y, width, height, index } = p as unknown as { x: number; y: number; width: number; height: number; index: number }
                  const d = data[index]
                  return (
                    <text x={x + width + 8} y={y + height / 2} dominantBaseline="central" className="num" fontSize={11} fontWeight={600} fill="#3b4a60">
                      {d.kwh.toFixed(1)} kWh · {d.pct.toFixed(0)}%
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

export function NetEnergyChart({ rows, marker }: { rows: HourlyResult[]; marker?: number }) {
  const x = xTicks(rows)
  const data = rows.map((r) => ({ hour: r.hour, net: +r.netGain.toFixed(0) }))
  return (
    <ChartFrame
      title="Net thermal energy"
      subtitle="Solar + internal gains minus heat loss, per hour (W). Above zero the shelter is warming."
      legend={[{ label: 'Net gain', color: VIZ[0] }, { label: 'Net loss', color: VIZ[1] }]}
    >
      <div className="h-[280px]" role="img" aria-label="Net thermal energy by hour">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="hour" type="number" domain={[x.domain[0] - 0.6, x.domain[1] + 0.6]} ticks={x.ticks} tickFormatter={(h) => clock(h)} {...axisProps} />
            <YAxis {...yAxisProps} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            {marker !== undefined && <ReferenceLine x={marker} stroke="#0b1a2f" strokeDasharray="4 3" />}
            <Tooltip cursor={{ fill: '#f1f5fb' }} content={<ChartTooltip title={(l) => clock(Number(l))} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)} W`} />} />
            <Bar dataKey="net" name="Net" radius={[3, 3, 3, 3]} maxBarSize={18}>
              {data.map((d) => <Cell key={d.hour} fill={d.net >= 0 ? VIZ[0] : VIZ[1]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}
