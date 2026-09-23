import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HourlyResult } from '../../types/simulation'
import { clock } from '../../utils/format'
import { ChartFrame, ChartTooltip, GRID, VIZ, axisProps, niceTicks, yAxisProps } from './chartTheme'

export function WhatIfChart({ current, modified, comfortMin, comfortMax }: { current: HourlyResult[]; modified: HourlyResult[]; comfortMin: number; comfortMax: number }) {
  const data = current.map((r, i) => ({ hour: r.hour, current: +r.indoorTemp.toFixed(2), modified: +(modified[i]?.indoorTemp ?? NaN).toFixed(2), outdoor: +r.outdoorTemp.toFixed(2) }))
  const all = data.flatMap((d) => [d.current, d.modified, d.outdoor]).concat([comfortMin, comfortMax]).filter(Number.isFinite)
  const yDomain: [number, number] = [Math.floor(Math.min(...all) / 2) * 2 - 2, Math.ceil(Math.max(...all) / 2) * 2 + 2]
  return (
    <ChartFrame
      title="Indoor temperature — current vs modified"
      subtitle="Same weather, two designs"
      legend={[
        { label: 'Current design', color: VIZ[0], swatch: 'line' },
        { label: 'Modified design', color: VIZ[1], swatch: 'line' },
        { label: 'Outdoor', color: '#94a3b8', swatch: 'line' },
      ]}
    >
      <div className="h-[260px]" role="img" aria-label="Indoor temperature for current and modified designs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <ReferenceArea y1={comfortMin} y2={comfortMax} fill="#1baf7a" fillOpacity={0.12} stroke="none" />
            <XAxis dataKey="hour" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(h) => clock(h)} {...axisProps} />
            <YAxis {...yAxisProps} domain={yDomain} ticks={niceTicks(yDomain[0], yDomain[1])} allowDataOverflow tickFormatter={(v) => `${v}°`} />
            <Tooltip cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} content={<ChartTooltip title={(l) => clock(Number(l))} format={(v) => `${v.toFixed(1)} °C`} />} />
            <Line type="monotone" dataKey="outdoor" name="Outdoor" stroke="#94a3b8" strokeWidth={1.6} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="current" name="Current" stroke={VIZ[0]} strokeWidth={2.2} dot={false} activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="modified" name="Modified" stroke={VIZ[1]} strokeWidth={2.2} dot={false} activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}
