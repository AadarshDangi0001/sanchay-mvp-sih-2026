import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Box, CloudSun, Layers, Play, Ruler } from 'lucide-react'
import { Card, CardHeader } from '../components/common/Card'
import { DemoBadge, Notice } from '../components/common/Badges'
import { FieldError } from '../components/common/Field'
import { Term } from '../components/common/Term'
import { toast } from '../components/common/Toaster'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { RunOverlay, type RunLog } from '../components/simulation/RunOverlay'
import { ShelterStage } from '../components/shelter/ShelterStage'
import { getMaterial } from '../data/materials'
import { buildEnvelope } from '../data/mockSimulation'
import { SIMULATION_STAGES, runSimulation } from '../services/api'
import { isSimulationStale, useProjectStore } from '../store/useProjectStore'
import { bearingLabel, deriveGeometry, designLabel } from '../utils/geometry'
import { clock } from '../utils/format'
import { summarizeWeather } from '../utils/thermal'
import { timeAgo } from '../utils/format'

const schema = z
  .object({
    startHour: z.number({ error: 'Enter an hour.' }).int().min(0, '0–23').max(22, 'Start must be before 23:00'),
    endHour: z.number({ error: 'Enter an hour.' }).int().min(1, '1–23').max(23, '0–23'),
    timeStep: z.number(),
    comfortMin: z.number({ error: 'Enter a temperature.' }).min(5, 'Min 5 °C').max(30, 'Max 30 °C'),
    comfortMax: z.number({ error: 'Enter a temperature.' }).min(10, 'Min 10 °C').max(40, 'Max 40 °C'),
    ventilationACH: z.number({ error: 'Enter a value.' }).min(0.1, 'Min 0.1').max(3, 'Max 3'),
    occupants: z.number({ error: 'Enter a number.' }).int().min(0, 'Min 0').max(10, 'Max 10'),
  })
  .refine((v) => v.endHour > v.startHour, { path: ['endHour'], message: 'End time must be after the start time.' })
  .refine((v) => v.comfortMax - v.comfortMin >= 2, { path: ['comfortMax'], message: 'Comfort range must span at least 2 °C.' })
type Values = z.infer<typeof schema>

export default function Simulation() {
  useVisit('simulate')
  const nav = useNavigate()
  const state = useProjectStore()
  const { design, weather, settings, setSettings, setSimulationResults, simulationResults } = state
  const stale = isSimulationStale(state)
  const [log, setLog] = useState<RunLog | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: settings,
  })

  // Persist valid edits immediately so nothing is lost when navigating away.
  useEffect(() => {
    const sub = watch((v) => {
      const r = schema.safeParse(v)
      if (r.success) setSettings(r.data)
    })
    return () => sub.unsubscribe()
  }, [watch, setSettings])

  const geo = useMemo(() => deriveGeometry(design), [design])
  const sum = useMemo(() => summarizeWeather(weather), [weather])
  const env = useMemo(() => buildEnvelope(geo, settings, sum.meanWind), [geo, settings, sum.meanWind])

  const run = handleSubmit(async (values) => {
    setSettings(values)
    const lines: string[] = [`design ${designLabel(design)} @ ${Math.round(design.orientation)}°`, `weather ${weather.location} · ${sum.minTemp.toFixed(0)}…${sum.maxTemp.toFixed(0)} °C`]
    setLog({ stage: 0, progress: 0, lines })
    const stageLines = [
      [`mesh: ${geo.surfaces.length} surfaces · ${geo.windowsFitted} windows · ${geo.envelopeArea.toFixed(0)} m² envelope`],
      [`layers: wall ${getMaterial(design.wallMaterial).name} ${design.wallThickness} mm`, `U(wall) ${env.summary.uValue.walls.toFixed(2)}  U(roof) ${env.summary.uValue.roof.toFixed(2)}  U(win) ${env.summary.uValue.windows.toFixed(2)} W/m²K`],
      [`UA total ${env.summary.totalUA.toFixed(1)} W/K`, `time constant τ = ${env.summary.timeConstant.toFixed(0)} h`, 'iterating to periodic steady state…'],
      ['post-processing: comfort hours, loss breakdown, net energy'],
    ]
    const result = await runSimulation({ design, weather, settings: values }, (stage, progress) => {
      setLog((l) => ({ stage, progress, lines: [...(l?.lines ?? lines), ...(stageLines[stage] ?? [])] }))
    })
    setSimulationResults(result)
    setLog(null)
    toast('Simulation complete — demo results ready.')
    nav('/results')
  })

  const timeStep = watch('timeStep')
  const start = watch('startHour')
  const end = watch('endHour')
  const mats: [string, string][] = [
    ['Walls', `${getMaterial(design.wallMaterial).name} · ${design.wallThickness} mm`],
    ['Roof', `${getMaterial(design.roofMaterial).name} · ${design.roofThickness} mm`],
    ['Floor', `${getMaterial(design.floorMaterial).name} · ${design.floorThickness} mm`],
    ['Windows', getMaterial(design.windowMaterial).name],
    ['Thermal mass', design.massThickness > 0 ? `${getMaterial(design.thermalMassMaterial).name} · ${design.massThickness} mm` : 'None'],
  ]

  const num = (name: keyof Values, label: React.ReactNode, props: { step?: string; unit?: string } = {}) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <div className="relative">
        <input id={name} type="number" step={props.step ?? '1'} className={`input num text-right ${errors[name] ? 'input-error' : ''} ${props.unit ? 'pr-11' : ''}`} {...register(name, { valueAsNumber: true })} />
        {props.unit && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-mute">{props.unit}</span>}
      </div>
      <FieldError message={errors[name]?.message as string | undefined} />
    </div>
  )

  return (
    <>
      <PageHeader step="simulate" title="Simulation settings" subtitle="Confirm what will be simulated, set the period and comfort range, then run the demo thermal engine." actions={<DemoBadge />} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Configuration" title="Period, step & comfort range" />
            <form className="space-y-5 p-5" onSubmit={run} noValidate id="sim-form">
              <div className="grid gap-4 sm:grid-cols-3">
                {num('startHour', 'Start hour', { unit: 'h' })}
                {num('endHour', 'End hour', { unit: 'h' })}
                <div>
                  <label htmlFor="timeStep" className="label"><Term k="time-step">Time step</Term></label>
                  <select id="timeStep" className="input" {...register('timeStep', { valueAsNumber: true })}>
                    <option value={0.5}>30 minutes</option>
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                  </select>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-ink-soft">
                Simulation period: <span className="num font-bold text-ink">{clock(Number.isFinite(start) ? start : 6)} – {clock(Number.isFinite(end) ? end : 23)}</span> · every <span className="num font-bold text-ink">{timeStep === 0.5 ? '30 min' : timeStep === 2 ? '2 h' : '1 h'}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {num('comfortMin', <>Comfort range · min</>, { unit: '°C' })}
                {num('comfortMax', <><Term k="comfort-range">Comfort range</Term> · max</>, { unit: '°C' })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {num('ventilationACH', <Term k="ach">Ventilation (air changes / h)</Term>, { step: '0.1' })}
                {num('occupants', 'Occupants (internal gain)')}
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-md">
                <h3 className="text-[15px] font-bold tracking-tight">Ready to run</h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-soft">
                  Runs a deterministic in-browser model — {SIMULATION_STAGES.length} stages, a few seconds. Results are illustrative, not engineering-grade.
                </p>
                {simulationResults && (
                  <p className="mt-2 text-xs font-semibold text-ink-mute">
                    Last run {timeAgo(simulationResults.createdAt)} · {stale ? <span className="text-amber-700">design or settings changed since then</span> : 'up to date'}
                  </p>
                )}
              </div>
              <button type="submit" form="sim-form" className="btn-primary !px-6 !py-3.5 !text-[15px]" disabled={!!log || Object.keys(errors).length > 0}>
                <Play size={17} fill="currentColor" /> Run Thermal Simulation
              </button>
            </div>
          </Card>
          <Notice tone="warn"><strong className="font-bold">Demo Simulation – Illustrative Results.</strong> No ANSYS, weather API or ML model is connected. The engine is a simplified lumped-capacity model used to demonstrate the workflow.</Notice>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="What will be simulated" title="Model summary" />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-mute"><Box size={14} /> Shelter</div>
                <div className="text-sm font-bold">{designLabel(design)}</div>
                <div className="num mt-1 text-xs font-semibold text-ink-soft">Roof {geo.roofAngleEff.toFixed(0)}° · facing {Math.round(design.orientation)}° {bearingLabel(design.orientation)}</div>
                <div className="num text-xs font-semibold text-ink-soft">{geo.windowsFitted} windows · {geo.windowArea.toFixed(1)} m² glazing</div>
              </div>
              <div className="rounded-xl border border-line p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-mute"><CloudSun size={14} /> Climate</div>
                <div className="text-sm font-bold">{weather.location}</div>
                <div className="num mt-1 text-xs font-semibold text-ink-soft">{sum.minTemp.toFixed(0)} to {sum.maxTemp.toFixed(0)} °C · peak {sum.peakSolar.toFixed(0)} W/m²</div>
                <div className="text-xs font-semibold text-ink-mute">{weather.sourceLabel}</div>
              </div>
              <div className="rounded-xl border border-line p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-mute"><Layers size={14} /> Materials</div>
                <ul className="space-y-1">
                  {mats.map(([k, v]) => <li key={k} className="flex justify-between gap-3 text-xs font-semibold"><span className="text-ink-mute">{k}</span><span className="truncate text-right text-ink-soft">{v}</span></li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-line p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-mute"><Ruler size={14} /> Geometry</div>
                <ul className="num space-y-1 text-xs font-semibold">
                  {[['Floor', `${geo.floorArea.toFixed(1)} m²`], ['Volume', `${geo.volume.toFixed(1)} m³`], ['Envelope', `${geo.envelopeArea.toFixed(0)} m²`], ['UA total', `${env.summary.totalUA.toFixed(0)} W/K`]].map(([k, v]) => (
                    <li key={k} className="flex justify-between"><span className="text-ink-mute">{k}</span><span className="text-ink-soft">{v}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          <ShelterStage design={design} compact defaults={{ dims: false, sunPath: true, rotate: true }} className="h-[300px]" caption="Model to be simulated" />
        </div>
      </div>

      <StepNav back="/materials" backLabel="Materials" next={simulationResults ? '/results' : undefined} nextLabel="View last results" hint={simulationResults ? undefined : 'Run the simulation to continue'} />
      {log && <RunOverlay log={log} />}
    </>
  )
}
