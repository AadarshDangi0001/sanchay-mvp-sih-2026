import { RAMP_CSS, thermalRange, type ThermalMode } from './ThermalHeatmap'
import type { SimulationResult } from '../../types/simulation'
import type { WeatherData } from '../../types/project'

const TITLES: Record<ThermalMode, string> = {
  normal: '', temperature: 'Inside surface temperature', heatloss: 'Conductive heat flux', solar: 'Incident solar irradiance',
}

/** Low → Medium → High colour key, always labelled as illustrative. */
export function ThermalLegend({ mode, result, weather }: { mode: ThermalMode; result: SimulationResult; weather: WeatherData }) {
  if (mode === 'normal') return null
  const r = thermalRange(mode, result, weather)
  const mid = (r.min + r.max) / 2
  const f = (v: number) => (mode === 'temperature' ? v.toFixed(0) : v.toFixed(0))
  return (
    <div className="pointer-events-none absolute left-4 top-12 z-10 w-[220px] rounded-xl border border-line bg-white/92 p-3 shadow-card backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-ink">{TITLES[mode]}</span>
      </div>
      <div className="h-2.5 rounded-full" style={{ background: RAMP_CSS }} />
      <div className="mt-1.5 flex justify-between text-[10px] font-bold text-ink-soft">
        <span>Low</span><span>Medium</span><span>High</span>
      </div>
      <div className="num mt-0.5 flex justify-between text-[10px] font-semibold text-ink-mute">
        <span>{f(r.min)}</span><span>{f(mid)}</span><span>{f(r.max)} {r.unit}</span>
      </div>
      <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">Illustrative / demo data</div>
    </div>
  )
}
