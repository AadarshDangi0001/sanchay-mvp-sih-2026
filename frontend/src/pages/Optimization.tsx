import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bookmark, Lock, LockOpen, Sparkles, Upload } from 'lucide-react'
import { Delta } from '../components/common/Delta'
import { AiBadge, Notice } from '../components/common/Badges'
import { Card, CardHeader } from '../components/common/Card'
import { Segmented } from '../components/common/Segmented'
import { Spinner } from '../components/common/Loader'
import { toast } from '../components/common/Toaster'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { ConfigCloud } from '../components/optimization/ConfigCloud'
import { getMaterial } from '../data/materials'
import { runMockSimulation } from '../data/mockSimulation'
import { runOptimization } from '../services/api'
import { useProjectStore } from '../store/useProjectStore'
import type { CloudPoint, OptimizationCandidate, OptimizationPriority } from '../types/simulation'
import { SHELTER_TYPES, bearingLabel, deriveGeometry } from '../utils/geometry'
import { OPT_PARAMS, PRIORITIES } from '../utils/optimization'
import { ShelterThumb } from './Comparison'

export function CandidateCard({ c, base, onView, onApply, onSave, selected }: {
  c: OptimizationCandidate
  base: OptimizationCandidate['metrics']
  onView?: () => void
  onApply?: () => void
  onSave?: () => void
  selected?: boolean
}) {
  const g = deriveGeometry(c.design)
  const rows: { label: string; v: number; b: number; better: 'high' | 'low'; unit: string; digits: number }[] = [
    { label: 'Comfort hours', v: c.metrics.comfortHours, b: base.comfortHours, better: 'high', unit: ' h', digits: 0 },
    { label: 'Heat loss', v: c.metrics.heatLossKWh, b: base.heatLossKWh, better: 'low', unit: ' kWh', digits: 1 },
    { label: 'Solar gain', v: c.metrics.solarGainKWh, b: base.solarGainKWh, better: 'high', unit: ' kWh', digits: 1 },
    { label: 'Energy requirement', v: c.metrics.energyKWh, b: base.energyKWh, better: 'low', unit: ' kWh', digits: 1 },
  ]
  return (
    <Card className={`flex flex-col overflow-hidden ${selected ? 'ring-2 ring-brand-300' : ''}`}>
      <div className="relative bg-[#eaf1fa] p-2">
        <ShelterThumb design={c.design} className="h-44" />
        <span className="num absolute left-4 top-4 grid h-7 w-7 place-items-center rounded-lg bg-aqua-500 text-sm font-extrabold text-white">{c.rank}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="eyebrow mb-0.5">{c.tag}</div>
        <h3 className="text-[16px] font-extrabold tracking-tight">{c.label}</h3>
        <p className="num mt-1 text-xs font-semibold text-ink-mute">
          {SHELTER_TYPES.find((t) => t.id === c.design.type)!.label} · {c.design.length.toFixed(1)}×{c.design.width.toFixed(1)}×{c.design.height.toFixed(1)} m · {Math.round(c.design.orientation)}° {bearingLabel(c.design.orientation)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[`${g.windowArea.toFixed(1)} m² glazing`, `${getMaterial(c.design.wallMaterial).name} ${c.design.wallThickness} mm`, `Cost idx ${c.relCost.toFixed(0)}`].map((t) => <span key={t} className="chip !py-0.5 !text-[11px]">{t}</span>)}
        </div>
        <dl className="mt-4 space-y-2.5 border-t border-line pt-4">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <dt className="text-[13px] font-semibold text-ink-soft">{r.label}</dt>
              <dd className="flex items-baseline gap-2"><Delta value={r.v} base={r.b} better={r.better} digits={r.digits} /><span className="num min-w-[64px] text-right text-[15px] font-bold">{r.v.toFixed(r.digits)}<span className="text-[11px] font-semibold text-ink-mute">{r.unit}</span></span></dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap gap-2 pt-1">
          {onView && <button className="btn-primary flex-1" onClick={onView}>View design <ArrowRight size={15} /></button>}
          {onApply && <button className="btn-outline btn-sm" onClick={onApply} title="Load into the editor"><Upload size={14} /> Apply</button>}
          {onSave && <button className="btn-outline btn-sm" onClick={onSave} title="Save for comparison"><Bookmark size={14} /></button>}
        </div>
      </div>
    </Card>
  )
}

export default function Optimization() {
  useVisit('optimize')
  const nav = useNavigate()
  const design = useProjectStore((s) => s.design)
  const weather = useProjectStore((s) => s.weather)
  const settings = useProjectStore((s) => s.settings)
  const result = useProjectStore((s) => s.optimizationResults)
  const setResult = useProjectStore((s) => s.setOptimizationResults)
  const select = useProjectStore((s) => s.selectRecommendation)
  const selected = useProjectStore((s) => s.selectedRecommendation)
  const setDesign = useProjectStore((s) => s.setDesign)
  const saveDesign = useProjectStore((s) => s.saveCurrentDesign)

  const [locked, setLocked] = useState<string[]>(result?.locked ?? [])
  const [priority, setPriority] = useState<OptimizationPriority>(result?.priority ?? 'balanced')
  const [running, setRunning] = useState(false)
  const [live, setLive] = useState<{ done: number; total: number; phase: string; points: CloudPoint[] } | null>(null)

  const baseline = useMemo(() => runMockSimulation({ design, weather, settings }).metrics, [design, weather, settings])
  const shownBase = result?.baseline ?? baseline
  const points = running && live ? live.points : result?.cloud ?? []
  const maxY = Math.max(6, Math.ceil(settings.endHour - settings.startHour))

  const run = async () => {
    setRunning(true)
    setLive({ done: 0, total: 1200, phase: 'Preparing search space', points: [] })
    try {
      const r = await runOptimization({ design, weather, settings, locked, priority }, (p) => setLive(p))
      setResult(r)
      toast('Optimization complete — 3 configurations recommended.')
    } finally {
      setRunning(false)
      setLive(null)
    }
  }

  const toggle = (id: string) => setLocked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const pct = live ? Math.round((live.done / live.total) * 100) : 0

  return (
    <>
      <PageHeader step="optimize" title="Optimize the design" subtitle="Search a thousand-plus configurations of shape, size, orientation, glazing and materials, and surface the three that score best in the demo engine." actions={<AiBadge />} />

      <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader eyebrow="Objective" title="What matters most?" />
            <div className="space-y-4 p-5">
              <Segmented<OptimizationPriority> value={priority} onChange={setPriority} className="w-full [&>button]:flex-1" options={PRIORITIES.map((p) => ({ id: p.id, label: p.label }))} />
              <p className="text-xs font-medium text-ink-mute">{PRIORITIES.find((p) => p.id === priority)!.blurb}. Build cost is always weighed lightly.</p>
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow="Search space" title="Parameters to optimize" action={<span className="num text-xs font-bold text-ink-mute">{OPT_PARAMS.length - locked.length} free · {locked.length} locked</span>} />
            <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
              {OPT_PARAMS.map((p) => {
                const isLocked = locked.includes(p.id)
                return (
                  <button key={p.id} onClick={() => toggle(p.id)} aria-pressed={isLocked}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] font-bold transition ${isLocked ? 'border-line bg-slate-50 text-ink-mute' : 'border-brand-200 bg-brand-50/60 text-brand-800 hover:border-brand-400'}`}>
                    {p.label}
                    {isLocked ? <Lock size={13} /> : <LockOpen size={13} className="text-aqua-600" />}
                  </button>
                )
              })}
            </div>
            <div className="border-t border-line px-5 py-4">
              <button className="btn-primary w-full !py-3" onClick={run} disabled={running || locked.length === OPT_PARAMS.length}>
                {running ? <><Spinner /> Analyzing…</> : <><Sparkles size={16} /> {result ? 'Re-run optimization' : 'Optimize Design'}</>}
              </button>
              <p className="mt-2.5 text-center text-[11px] font-medium text-ink-mute">Locked parameters keep your current value. Results are deterministic for the same inputs.</p>
            </div>
          </Card>
        </div>

        <Card className="flex flex-col p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="eyebrow mb-0.5">Configuration space</div>
              <h3 className="text-[15px] font-bold tracking-tight">
                {running ? 'Analyzing 1000+ possible configurations…' : result ? `${result.evaluated.toLocaleString()} configurations evaluated` : 'Nothing evaluated yet'}
              </h3>
            </div>
            {running && <span className="num text-sm font-bold text-brand-700">{live?.done.toLocaleString()} / {live?.total.toLocaleString()}</span>}
          </div>
          {running && (
            <div className="mb-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-aqua-500 transition-all duration-200" style={{ width: `${pct}%` }} /></div>
              <div className="mt-1.5 flex items-center justify-between text-xs font-semibold text-ink-mute"><span>{live?.phase}</span><span className="num">{pct}%</span></div>
            </div>
          )}
          {points.length === 0 && !running ? (
            <div className="bp-dots grid flex-1 place-items-center rounded-xl border border-dashed border-line py-16 text-center">
              <div><Sparkles className="mx-auto mb-2 text-brand-500" /><p className="max-w-xs text-sm font-medium text-ink-soft">Every candidate will appear here as a dot: further left is less energy, higher is more comfort.</p></div>
            </div>
          ) : (
            <ConfigCloud
              points={points} maxY={maxY} scanning={running} baseline={{ x: shownBase.energyKWh, y: shownBase.comfortHours }}
              picks={!running && result ? result.candidates.map((c) => ({ x: c.metrics.energyKWh, y: c.metrics.comfortHours, n: c.rank })) : []}
            />
          )}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-ink-mute">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-400/60" /> candidate</span>
            <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-brand-600" /> best trade-offs (Pareto front)</span>
            <span className="flex items-center gap-1.5"><span className="font-extrabold text-orange-600">✕</span> your current design</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-aqua-500" /> recommended</span>
          </div>
        </Card>
      </div>

      {result && !running && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Recommended configurations</h2>
              <p className="text-sm font-medium text-ink-soft">Deltas are relative to your current design ({shownBase.comfortHours.toFixed(0)} comfort hours, {shownBase.energyKWh.toFixed(1)} kWh energy).</p>
            </div>
            <AiBadge />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {result.candidates.map((c) => (
              <CandidateCard
                key={c.id} c={c} base={result.baseline} selected={selected === c.id}
                onView={() => { select(c.id); nav('/recommendation') }}
                onApply={() => { setDesign(c.design); toast(`${c.label} loaded into the editor.`, 'info') }}
                onSave={() => { const prev = design; setDesign(c.design); const r = saveDesign(`${c.label} · ${c.tag}`); setDesign(prev); toast(r.message, r.ok ? 'success' : 'error') }}
              />
            ))}
          </div>
          <Notice tone="warn" className="mt-5"><strong className="font-bold">AI Optimization Demo.</strong> A seeded random search scored by the demo thermal engine — no machine-learning model is trained or called.</Notice>
        </section>
      )}

      <StepNav back="/comparison" backLabel="Comparison" next="/recommendation" nextLabel="Recommended design" disabled={!result} hint={result ? undefined : 'Run the optimization to continue'} onNext={result ? () => { if (!selected) select(result.candidates[0].id); nav('/recommendation') } : undefined} />
    </>
  )
}
