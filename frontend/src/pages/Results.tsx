import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Gauge, Pause, Play, Snowflake, Sun, Thermometer, TrendingDown, Zap } from 'lucide-react'
import { HeatLossChart, IndoorOutdoorChart, NetEnergyChart, SolarChart } from '../components/charts/ResultsCharts'
import { DemoBadge, Notice } from '../components/common/Badges'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { Segmented } from '../components/common/Segmented'
import { Stat } from '../components/common/Stat'
import { Term } from '../components/common/Term'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { ShelterStage } from '../components/shelter/ShelterStage'
import { ThermalLegend } from '../components/shelter3d/ThermalLegend'
import { THERMAL_MODES, type ThermalMode, type ThermalView } from '../components/shelter3d/ThermalHeatmap'
import { isSimulationStale, useProjectStore } from '../store/useProjectStore'
import { clock, signed } from '../utils/format'

export default function Results() {
  useVisit('results')
  const state = useProjectStore()
  const { simulationResults: res, weather, design } = state
  const stale = isSimulationStale(state)
  const [mode, setMode] = useState<ThermalMode>('temperature')
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)

  const rows = res?.hourly ?? []
  useEffect(() => {
    // Start the scrubber at the warmest hour, which makes the heat-map immediately interesting.
    if (rows.length) setIdx(rows.reduce((b, r, i) => (r.indoorTemp > rows[b].indoorTemp ? i : b), 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res?.id])
  useEffect(() => {
    if (!playing || !rows.length) return
    const t = setInterval(() => setIdx((i) => (i + 1) % rows.length), 650)
    return () => clearInterval(t)
  }, [playing, rows.length])

  const thermal = useMemo<ThermalView | undefined>(
    () => (res && mode !== 'normal' ? { mode, hourIndex: idx, result: res, weather } : undefined),
    [res, mode, idx, weather],
  )

  if (!res) {
    return (
      <>
        <PageHeader step="results" title="Thermal results" />
        <EmptyState icon={<Thermometer size={26} />} title="No simulation results yet" body="Run the thermal simulation to see indoor temperature, solar gain, heat loss and comfort hours for this design." action={<Link to="/simulation" className="btn-primary"><Play size={15} fill="currentColor" /> Go to simulation</Link>} />
        <StepNav back="/simulation" backLabel="Simulation" />
      </>
    )
  }

  const m = res.metrics
  const row = rows[Math.min(idx, rows.length - 1)]
  const hh = row.hour

  return (
    <>
      <PageHeader step="results" title="Thermal results" subtitle={`${res.weatherLabel} · ${clock(res.settings.startHour)}–${clock(res.settings.endHour)}, comfort ${res.settings.comfortMin}–${res.settings.comfortMax} °C`} actions={<DemoBadge />} />
      {stale && (
        <Notice tone="warn" className="mb-5">
          The design, weather or settings changed after this simulation ran. <Link to="/simulation" className="font-bold underline">Re-run the simulation</Link> to refresh these results.
        </Notice>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Stat label="Avg indoor" value={m.avgIndoor.toFixed(1)} unit="°C" icon={<Thermometer size={16} />} delta={`${signed(m.avgIndoor - m.avgOutdoor)} °C vs outdoor`} />
        <Stat label="Minimum" value={m.minIndoor.toFixed(1)} unit="°C" icon={<Snowflake size={16} />} tone="aqua" hint={`comfort floor ${res.settings.comfortMin} °C`} />
        <Stat label="Maximum" value={m.maxIndoor.toFixed(1)} unit="°C" icon={<Flame size={16} />} tone="amber" hint={`comfort ceiling ${res.settings.comfortMax} °C`} />
        <Stat label="Solar gain" term="solar-gain" value={m.solarGainKWh.toFixed(1)} unit="kWh" icon={<Sun size={16} />} tone="amber" hint="windows + absorbed" />
        <Stat label="Heat loss" term="heat-loss" value={m.heatLossKWh.toFixed(1)} unit="kWh" icon={<TrendingDown size={16} />} tone="red" hint={`${m.energyKWh.toFixed(1)} kWh to hold comfort`} />
        <Stat label="Comfort hours" value={m.comfortHours.toFixed(m.comfortHours % 1 ? 1 : 0)} unit={`/ ${m.totalHours.toFixed(0)} h`} icon={<Gauge size={16} />} tone="green" hint={`${m.comfortPct.toFixed(0)}% of the period`} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <div className="eyebrow mb-0.5">3D thermal view</div>
              <h3 className="text-[15px] font-bold tracking-tight">Where the heat goes</h3>
            </div>
            <Segmented<ThermalMode> size="sm" value={mode} onChange={(m) => { setMode(m); if (m === 'solar' && rows.length) setIdx(rows.reduce((b, r, i) => (Math.abs(r.hour - 12) < Math.abs(rows[b].hour - 12) ? i : b), 0)) }} options={THERMAL_MODES.map((t) => ({ id: t.id, label: t.short }))} />
          </div>
          <ShelterStage design={design} thermal={thermal} compact hourOverride={hh} defaults={{ dims: false, sunPath: true }} className="!rounded-none !border-0 h-[440px]" overlay={<ThermalLegend mode={mode} result={res} weather={weather} />} caption={mode === 'normal' ? 'Normal view' : `${THERMAL_MODES.find((t) => t.id === mode)!.label} · ${clock(hh)}`} />
          <div className="border-t border-line bg-slate-50/60 px-5 py-4">
            <div className="flex items-center gap-4">
              <button className="btn-outline btn-sm !px-3" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play through the day'}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <input type="range" className="slider flex-1" min={0} max={rows.length - 1} step={1} value={idx} onChange={(e) => { setPlaying(false); setIdx(+e.target.value) }} style={{ ['--fill' as string]: `${(idx / Math.max(rows.length - 1, 1)) * 100}%` }} aria-label="Hour of day" />
              <div className="num w-14 text-right text-lg font-bold">{clock(hh)}</div>
            </div>
            <div className="num mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-semibold text-ink-mute">
              {[['Indoor', `${row.indoorTemp.toFixed(1)}°C`], ['Outdoor', `${row.outdoorTemp.toFixed(1)}°C`], ['Solar gain', `${row.solarGain.toFixed(0)} W`], ['Heat loss', `${row.heatLoss.toFixed(0)} W`]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white px-2 py-1.5 ring-1 ring-line"><div className="uppercase tracking-wider">{k}</div><div className="text-sm font-bold text-ink">{v}</div></div>
              ))}
            </div>
          </div>
        </Card>
        <IndoorOutdoorChart rows={rows} comfortMin={res.settings.comfortMin} comfortMax={res.settings.comfortMax} marker={hh} height={468} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <SolarChart rows={rows} marker={hh} />
        <HeatLossChart lossKWh={res.lossKWh} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <NetEnergyChart rows={rows} marker={hh} />
        <Card className="p-5">
          <h3 className="mb-1 text-[15px] font-bold tracking-tight">Envelope snapshot</h3>
          <p className="mb-4 text-xs font-medium text-ink-mute">What sits behind the numbers</p>
          <dl className="num space-y-2.5 text-sm">
            {[
              ['Total UA', `${res.envelope.totalUA.toFixed(1)} W/K`, 'heat-loss'],
              ['Wall U-value', `${res.envelope.uValue.walls.toFixed(2)} W/m²K`, 'u-value'],
              ['Roof U-value', `${res.envelope.uValue.roof.toFixed(2)} W/m²K`, 'u-value'],
              ['Window U-value', `${res.envelope.uValue.windows.toFixed(2)} W/m²K`, 'u-value'],
              ['Thermal capacity', `${(res.envelope.capacity / 1000).toFixed(2)} kWh/K`, 'thermal-mass'],
              ['Time constant', `${res.envelope.timeConstant.toFixed(0)} h`, 'time-constant'],
              ['Heating energy', `${m.heatingKWh.toFixed(1)} kWh`, 'energy-req'],
              ['Cooling energy', `${m.coolingKWh.toFixed(1)} kWh`, 'energy-req'],
            ].map(([k, v, t]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-2 last:border-0">
                <dt className="font-sans text-[13px] font-semibold text-ink-soft"><Term k={t}>{k}</Term></dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <details className="card mb-2 p-5">
        <summary className="cursor-pointer text-sm font-bold text-ink-soft"><Zap size={14} className="mr-1.5 inline text-brand-600" />View hourly data as a table</summary>
        <div className="mt-4 overflow-x-auto">
          <table className="num w-full min-w-[640px] text-right text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-ink-mute">
              <tr>{['Time', 'Outdoor °C', 'Indoor °C', 'Solar W/m²', 'Solar gain W', 'Heat loss W', 'Net W', 'Comfort'].map((h, i) => <th key={h} className={`border-b border-line pb-2 font-bold ${i === 0 ? 'text-left' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.hour} className="border-b border-line/60 font-semibold">
                  <td className="py-1.5 text-left">{clock(r.hour)}</td><td>{r.outdoorTemp.toFixed(1)}</td><td>{r.indoorTemp.toFixed(1)}</td><td>{r.solarRadiation.toFixed(0)}</td>
                  <td>{r.solarGain.toFixed(0)}</td><td>{r.heatLoss.toFixed(0)}</td><td>{signed(r.netGain, 0)}</td><td>{r.comfortable ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <StepNav back="/simulation" backLabel="Simulation" next="/comparison" nextLabel="Compare designs" extra={<Link to="/whatif" className="btn-outline">What if?</Link>} />
    </>
  )
}
