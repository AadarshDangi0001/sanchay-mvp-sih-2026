import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HourlyWeather } from '../../types/project'
import { clock } from '../../utils/format'
import { ChartTooltip, GRID, VIZ, axisProps, yAxisProps } from './chartTheme'

export type WeatherMetric = 'temperature' | 'solar' | 'wind' | 'humidity'

export const WEATHER_META: Record<WeatherMetric, { label: string; unit: string; color: string; digits: number }> = {
  temperature: { label: 'Temperature', unit: '°C', color: VIZ[1], digits: 1 },
  solar: { label: 'Solar irradiance', unit: 'W/m²', color: VIZ[3], digits: 0 },
  wind: { label: 'Wind speed', unit: 'm/s', color: VIZ[0], digits: 1 },
  humidity: { label: 'Relative humidity', unit: '%', color: VIZ[2], digits: 0 },
}

export function WeatherChart({ data, metric, height = 280 }: { data: HourlyWeather[]; metric: WeatherMetric; height?: number }) {
  const m = WEATHER_META[metric]
  return (
    <div role="img" aria-label={`24 hour ${m.label} profile`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="hour" type="number" domain={[0, 23]} ticks={[0, 3, 6, 9, 12, 15, 18, 21]} tickFormatter={(h) => clock(h)} {...axisProps} />
          <YAxis {...yAxisProps} unit="" />
          <Tooltip
            cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
            content={<ChartTooltip title={(l) => clock(Number(l))} format={(v) => `${v.toFixed(m.digits)} ${m.unit}`} />}
          />
          <Area type="monotone" dataKey={metric} name={m.label} stroke={m.color} strokeWidth={2} fill={m.color} fillOpacity={0.12} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Sparkline({ data, metric, color }: { data: HourlyWeather[]; metric: WeatherMetric; color: string }) {
  return (
    <div className="h-9 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Area type="monotone" dataKey={metric} stroke={color} strokeWidth={1.6} fill={color} fillOpacity={0.12} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
