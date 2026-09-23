import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, Printer } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis, Bar, BarChart, Cell } from 'recharts'
import { DemoBadge, Notice } from '../components/common/Badges'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { ShelterViewer } from '../components/shelter3d/ShelterViewer'
import { LOSS_COLOR, LOSS_LABELS, LOSS_ORDER } from '../components/charts/ResultsCharts'
import { GRID, VIZ, axisProps, yAxisProps } from '../components/charts/chartTheme'
import { getMaterial } from '../data/materials'
import { isSimulationStale, useProjectStore } from '../store/useProjectStore'
import type { ShelterDesign } from '../types/shelter'
import { SHELTER_TYPES, bearingLabel, deriveGeometry } from '../utils/geometry'
import { clock } from '../utils/format'
import { summarizeWeather } from '../utils/thermal'

/** Renders the 3D model once, captures a PNG, then swaps the WebGL canvas for the image (print-safe). */
function Snapshot({ design, lat, doy, label }: { design: ShelterDesign; lat: number; doy: number; label: string }) {
  const [url, setUrl] = useState<string | null>(null)
  return url ? (
    <img src={url} alt={label} className="h-[230px] w-full rounded-lg border border-line object-cover" />
  ) : (
    <ShelterViewer
      design={design} latitude={lat} dayOfYear={doy} hour={13} showDims showSunPath={false} quality="high" preserveBuffer
      interactive={false} onCapture={setUrl} className="h-[230px]"
    />
  )
}

const H2 = ({ n, children }: { n: string; children: React.ReactNode }) => (
  <h2 className="mb-3 mt-8 flex items-center gap-2.5 border-b border-line pb-2 text-[15px] font-extrabold tracking-tight first:mt-0">
    <span className="num rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{n}</span>{children}
  </h2>
)
const KV = ({ rows }: { rows: [string, string][] }) => (
  <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[12.5px]">
    {rows.map(([k, v]) => (
      <div key={k} className="flex justify-between gap-3 border-b border-dashed border-line py-1"><dt className="font-semibold text-ink-mute">{k}</dt><dd className="num text-right font-bold">{v}</dd></div>
    ))}
  </dl>
)

export default function Report() {
  useVisit('report')
  const state = useProjectStore()
  const { project, weather, design, settings, simulationResults: res, savedDesigns, optimizationResults: opt, selectedRecommendation } = state
  const stale = isSimulationStale(state)
  const geo = useMemo(() => deriveGeometry(design), [design])
  const sum = useMemo(() => summarizeWeather(weather), [weather])
  const rec = opt ? opt.candidates.find((c) => c.id === selectedRecommendation) ?? opt.candidates[0] : null
  const recGeo = rec ? deriveGeometry(rec.design) : null

  const download = () => {
    const blob = new Blob([JSON.stringify({ project, weather, design, settings, simulation: res, savedDesigns, recommendation: rec }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(project?.name ?? 'climaforge').replace(/\W+/g, '-').toLowerCase()}-report.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!project) {
    return (<><PageHeader step="report" title="Export report" /><EmptyState icon={<FileText size={26} />} title="No project open" body="Open or create a project to preview its report." action={<Link to="/" className="btn-primary">Dashboard</Link>} /></>)
  }

  const chartRows = res?.hourly ?? []
  const lossData = res ? LOSS_ORDER.map((k) => ({ name: LOSS_LABELS[k], kwh: +res.lossKWh[k].toFixed(2), k })) : []

  return (
    <>
      <PageHeader
        step="report" title="Report preview" subtitle="A printable summary of the project. Use Export to save it as a PDF from your browser’s print dialog."
        actions={<><button className="btn-outline" onClick={download}><Download size={15} /> Download data (JSON)</button><button className="btn-primary" onClick={() => window.print()}><Printer size={15} /> Export Report</button></>}
      />
      {(!res || stale) && <Notice tone="warn" className="mb-5">{!res ? 'No simulation results yet — the report will omit the results section.' : 'Simulation results are out of date with the current design.'} <Link className="font-bold underline" to="/simulation">Run the simulation</Link>.</Notice>}

      <article className="print-page card mx-auto max-w-[900px] p-8 md:p-12">
        <header className="mb-8 flex items-start justify-between gap-6 border-b-2 border-ink pb-6">
          <div>
            <div className="eyebrow mb-2">ClimaForge · Passive shelter report</div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{project.name}</h1>
            <p className="mt-2 max-w-lg text-sm font-medium text-ink-soft">{project.description}</p>
          </div>
          <div className="shrink-0 text-right"><DemoBadge className="!text-[10px]" /><div className="num mt-3 text-xs font-semibold text-ink-mute">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
        </header>

        <H2 n="01">Project information</H2>
        <KV rows={[['Project', project.name], ['Location', project.location], ['Climate type', project.climate], ['Created', new Date(project.createdAt).toLocaleDateString()]]} />

        <H2 n="02">Climate data</H2>
        <KV rows={[
          ['Coordinates', `${weather.latitude.toFixed(2)}°, ${weather.longitude.toFixed(2)}°`], ['Elevation', `${weather.elevation.toLocaleString()} m`],
          ['Temperature range', `${sum.minTemp.toFixed(0)} to ${sum.maxTemp.toFixed(0)} °C (mean ${sum.meanTemp.toFixed(0)})`], ['Peak solar irradiance', `${sum.peakSolar.toFixed(0)} W/m²`],
          ['Mean wind', `${sum.meanWind.toFixed(1)} m/s`], ['Mean humidity', `${sum.meanHumidity.toFixed(0)} %`], ['Design day', weather.season], ['Source', weather.sourceLabel],
        ]} />

        <H2 n="03">Shelter geometry</H2>
        <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
          <Snapshot design={design} lat={weather.latitude} doy={weather.dayOfYear} label="3D model of the current design" />
          <KV rows={[
            ['Shape', SHELTER_TYPES.find((t) => t.id === design.type)!.label], ['Size', `${design.length.toFixed(1)} × ${design.width.toFixed(1)} × ${design.height.toFixed(1)} m`],
            ['Roof angle', design.type === 'dome' ? 'Curved' : `${geo.roofAngleEff.toFixed(0)}°`], ['Orientation', `${Math.round(design.orientation)}° ${bearingLabel(design.orientation)}`],
            ['Windows', `${geo.windowsFitted} · ${geo.windowArea.toFixed(2)} m²`], ['Door', `${design.doorWidth.toFixed(2)} × ${design.doorHeight.toFixed(2)} m`],
            ['Floor area', `${geo.floorArea.toFixed(1)} m²`], ['Volume', `${geo.volume.toFixed(1)} m³`],
          ].map(([k, v]) => [k, v] as [string, string])} />
        </div>

        <H2 n="04">Materials</H2>
        <table className="w-full text-left text-[12.5px]">
          <thead className="text-[10px] uppercase tracking-wider text-ink-mute"><tr>{['Component', 'Material', 'Thickness', 'k (W/m·K)', 'ρ (kg/m³)', 'cp (J/kg·K)'].map((h) => <th key={h} className="border-b border-line pb-1.5 font-bold normal-case">{h}</th>)}</tr></thead>
          <tbody>
            {([['Walls', design.wallMaterial, `${design.wallThickness} mm`], ['Roof', design.roofMaterial, `${design.roofThickness} mm`], ['Floor', design.floorMaterial, `${design.floorThickness} mm`], ['Windows', design.windowMaterial, `${getMaterial(design.windowMaterial).thickness} mm`], ['Thermal mass', design.thermalMassMaterial, design.massThickness ? `${design.massThickness} mm` : 'none']] as const).map(([c, id, t]) => {
              const m = getMaterial(id)
              return <tr key={c} className="border-b border-line/60 font-semibold"><td className="py-1.5 text-ink-mute">{c}</td><td className="font-bold">{m.name}</td><td className="num">{t}</td><td className="num">{m.conductivity}</td><td className="num">{m.density}</td><td className="num">{m.specificHeat}</td></tr>
            })}
          </tbody>
        </table>

        {res && (
          <>
            <H2 n="05">Simulation results <span className="ml-1 text-[11px] font-semibold text-amber-700">Demo Simulation – Illustrative Results</span></H2>
            <div className="avoid-break mb-4 grid grid-cols-3 gap-3">
              {[['Avg indoor', `${res.metrics.avgIndoor.toFixed(1)} °C`], ['Min / max', `${res.metrics.minIndoor.toFixed(1)} / ${res.metrics.maxIndoor.toFixed(1)} °C`], ['Comfort hours', `${res.metrics.comfortHours.toFixed(0)} of ${res.metrics.totalHours.toFixed(0)} h`], ['Solar gain', `${res.metrics.solarGainKWh.toFixed(1)} kWh`], ['Heat loss', `${res.metrics.heatLossKWh.toFixed(1)} kWh`], ['Energy requirement', `${res.metrics.energyKWh.toFixed(1)} kWh`]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line px-3 py-2"><div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{k}</div><div className="num text-base font-bold">{v}</div></div>
              ))}
            </div>
            <div className="avoid-break grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-bold text-ink-soft">Indoor vs outdoor temperature (°C) · {clock(res.settings.startHour)}–{clock(res.settings.endHour)}</div>
                <LineChart width={400} height={190} data={chartRows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <ReferenceArea y1={res.settings.comfortMin} y2={res.settings.comfortMax} fill="#1baf7a" fillOpacity={0.12} />
                  <XAxis dataKey="hour" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(h) => clock(h)} {...axisProps} />
                  <YAxis {...yAxisProps} width={34} />
                  <Line type="monotone" dataKey="indoorTemp" stroke={VIZ[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="outdoorTemp" stroke={VIZ[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
                <div className="flex gap-4 text-[10px] font-semibold text-ink-soft"><span><span style={{ color: VIZ[0] }}>━</span> Indoor</span><span><span style={{ color: VIZ[1] }}>━</span> Outdoor</span></div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold text-ink-soft">Heat loss by component (kWh)</div>
                <BarChart width={400} height={190} data={lossData} layout="vertical" margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis type="number" {...axisProps} />
                  <YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} tick={{ fill: '#3b4a60', fontSize: 11 }} />
                  <Bar dataKey="kwh" isAnimationActive={false} radius={[0, 3, 3, 0]}>{lossData.map((d) => <Cell key={d.k} fill={LOSS_COLOR[d.k]} />)}</Bar>
                </BarChart>
              </div>
            </div>
          </>
        )}

        <H2 n="06">Design comparison</H2>
        {savedDesigns.length === 0 ? <p className="text-[13px] font-medium text-ink-mute">No designs have been saved for comparison.</p> : (
          <table className="avoid-break w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-ink-mute"><tr>{['Design', 'Shape', 'Avg °C', 'Heat loss', 'Solar gain', 'Comfort h', 'Energy'].map((h) => <th key={h} className="border-b border-line pb-1.5 font-bold">{h}</th>)}</tr></thead>
            <tbody>{savedDesigns.map((d) => <tr key={d.id} className="border-b border-line/60 font-semibold"><td className="py-1.5 font-bold">{d.name}</td><td>{SHELTER_TYPES.find((t) => t.id === d.design.type)!.label}</td><td className="num">{d.metrics.avgIndoor.toFixed(1)}</td><td className="num">{d.metrics.heatLossKWh.toFixed(1)} kWh</td><td className="num">{d.metrics.solarGainKWh.toFixed(1)} kWh</td><td className="num">{d.metrics.comfortHours.toFixed(0)}</td><td className="num">{d.metrics.energyKWh.toFixed(1)} kWh</td></tr>)}</tbody>
          </table>
        )}

        <H2 n="07">Recommended design</H2>
        {rec && recGeo ? (
          <div className="avoid-break">
            <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
              <Snapshot design={rec.design} lat={weather.latitude} doy={weather.dayOfYear} label={`3D model of ${rec.label}`} />
              <div>
                <div className="mb-2 text-sm font-extrabold">{rec.label} <span className="font-semibold text-ink-mute">· {rec.tag}</span></div>
                <KV rows={[
                  ['Shape', SHELTER_TYPES.find((t) => t.id === rec.design.type)!.label], ['Size', `${rec.design.length.toFixed(1)} × ${rec.design.width.toFixed(1)} × ${rec.design.height.toFixed(1)} m`],
                  ['Orientation', `${Math.round(rec.design.orientation)}° ${bearingLabel(rec.design.orientation)}`], ['Window area', `${recGeo.windowArea.toFixed(1)} m²`],
                  ['Walls', `${getMaterial(rec.design.wallMaterial).name} ${rec.design.wallThickness} mm`], ['Comfort hours', `${rec.metrics.comfortHours.toFixed(0)} h`], ['Energy', `${rec.metrics.energyKWh.toFixed(1)} kWh`], ['Heat loss', `${rec.metrics.heatLossKWh.toFixed(1)} kWh`],
                ]} />
              </div>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-[12.5px] font-medium text-ink-soft">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        ) : <p className="text-[13px] font-medium text-ink-mute">The AI optimization has not been run yet.</p>}

        <footer className="mt-10 border-t border-line pt-4 text-[11px] font-medium leading-relaxed text-ink-mute">
          <strong className="text-ink-soft">Disclaimer.</strong> Generated by the ClimaForge frontend MVP. All weather data, material values, simulation results and optimization outputs are mock / illustrative and must not be used for engineering decisions.
        </footer>
      </article>

      <StepNav back="/recommendation" backLabel="Recommended design" next="/" nextLabel="Back to dashboard" />
    </>
  )
}
