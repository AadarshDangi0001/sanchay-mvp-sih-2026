import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, CheckCircle2, Maximize2, Minimize2, Scale, Sparkles, Trophy, Upload } from 'lucide-react'
import { AiBadge, Notice } from '../components/common/Badges'
import { Card, CardHeader } from '../components/common/Card'
import { Delta } from '../components/common/Delta'
import { EmptyState } from '../components/common/EmptyState'
import { Segmented } from '../components/common/Segmented'
import { toast } from '../components/common/Toaster'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { ShelterStage } from '../components/shelter/ShelterStage'
import { getMaterial } from '../data/materials'
import { useProjectStore } from '../store/useProjectStore'
import { SHELTER_TYPES, bearingLabel, deriveGeometry } from '../utils/geometry'

export default function Recommendation() {
  useVisit('recommend')
  const nav = useNavigate()
  const opt = useProjectStore((s) => s.optimizationResults)
  const selectedId = useProjectStore((s) => s.selectedRecommendation)
  const select = useProjectStore((s) => s.selectRecommendation)
  const design = useProjectStore((s) => s.design)
  const setDesign = useProjectStore((s) => s.setDesign)
  const saveDesign = useProjectStore((s) => s.saveCurrentDesign)
  const box = useRef<HTMLDivElement>(null)
  const [fs, setFs] = useState(false)

  useEffect(() => {
    const on = () => setFs(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  if (!opt) {
    return (
      <>
        <PageHeader step="recommend" title="Recommended design" />
        <EmptyState icon={<Trophy size={26} />} title="No recommendation yet" body="Run the AI optimization to generate three candidate designs, then pick one to inspect in detail." action={<Link to="/optimize" className="btn-primary"><Sparkles size={15} /> Go to optimization</Link>} />
        <StepNav back="/optimize" backLabel="Optimization" />
      </>
    )
  }

  const c = opt.candidates.find((x) => x.id === selectedId) ?? opt.candidates[0]
  const geo = deriveGeometry(c.design)
  const b = opt.baseline
  const spec: [string, string][] = [
    ['Shape', SHELTER_TYPES.find((t) => t.id === c.design.type)!.label],
    ['Dimensions', `${c.design.length.toFixed(1)} × ${c.design.width.toFixed(1)} × ${c.design.height.toFixed(1)} m`],
    ['Orientation', `${Math.round(c.design.orientation)}° ${bearingLabel(c.design.orientation)}`],
    ['Roof angle', c.design.type === 'dome' ? 'Curved' : `${geo.roofAngleEff.toFixed(0)}°`],
    ['Window area', `${geo.windowArea.toFixed(1)} m² (${geo.windowsFitted} windows)`],
    ['Wall', `${getMaterial(c.design.wallMaterial).name} · ${c.design.wallThickness} mm`],
    ['Roof', `${getMaterial(c.design.roofMaterial).name} · ${c.design.roofThickness} mm`],
    ['Floor', `${getMaterial(c.design.floorMaterial).name} · ${c.design.floorThickness} mm`],
    ['Glazing', getMaterial(c.design.windowMaterial).name],
    ['Thermal mass', c.design.massThickness > 0 ? `${getMaterial(c.design.thermalMassMaterial).name} · ${c.design.massThickness} mm` : 'None'],
  ]

  return (
    <>
      <PageHeader
        step="recommend" title={c.label}
        subtitle={<>{c.tag}. Compared with your current design it delivers <strong className="text-ink">{c.metrics.comfortHours.toFixed(0)} comfort hours</strong> (was {b.comfortHours.toFixed(0)}) and needs <strong className="text-ink">{c.metrics.energyKWh.toFixed(1)} kWh</strong> of energy (was {b.energyKWh.toFixed(1)}).</>}
        actions={<AiBadge />}
      />

      <Segmented
        value={c.id} onChange={(id) => select(id)} className="mb-5"
        options={opt.candidates.map((x) => ({ id: x.id, label: `Design ${x.rank} · ${x.tag}` }))}
      />

      <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div ref={box} className={fs ? 'bg-canvas p-4' : ''}>
          <ShelterStage
            design={c.design} className={fs ? 'h-[calc(100vh-2rem)]' : 'h-[64vh] min-h-[460px]'}
            caption={<>{c.label} · recommended</>} defaults={{ dims: true, sunPath: true, rotate: !fs }}
            overlay={
              <button
                className="absolute right-4 top-16 z-10 grid h-9 w-9 place-items-center rounded-xl border border-line bg-white/90 text-ink-soft shadow-card backdrop-blur transition hover:text-brand-700"
                aria-label={fs ? 'Exit full screen' : 'Full screen'}
                onClick={() => (fs ? document.exitFullscreen() : box.current?.requestFullscreen())}
              >
                {fs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            }
          />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader eyebrow="Specification" title="Recommended parameters" />
            <dl className="p-5 pt-4">
              {spec.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-dashed border-line py-2 last:border-0">
                  <dt className="text-[13px] font-semibold text-ink-mute">{k}</dt>
                  <dd className="num text-right text-[13px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-5">
            <div className="eyebrow mb-3">Simulated performance vs current</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Comfort hours', c.metrics.comfortHours, b.comfortHours, 'high', 0, 'h'],
                ['Energy need', c.metrics.energyKWh, b.energyKWh, 'low', 1, 'kWh'],
                ['Heat loss', c.metrics.heatLossKWh, b.heatLossKWh, 'low', 1, 'kWh'],
                ['Solar gain', c.metrics.solarGainKWh, b.solarGainKWh, 'high', 1, 'kWh'],
              ].map(([k, v, base, better, d, u]) => (
                <div key={k as string} className="rounded-xl bg-slate-50 px-3.5 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{k as string}</div>
                  <div className="num text-xl font-bold">{(v as number).toFixed(d as number)}<span className="ml-1 text-xs font-semibold text-ink-mute">{u as string}</span></div>
                  <Delta value={v as number} base={base as number} better={better as 'high' | 'low'} digits={d as number} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold tracking-tight">Why this design?</h2>
          <span className="chip !border-amber-200 !bg-amber-50 !text-amber-800">Demo explanation · not a verified engineering conclusion</span>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {c.reasons.map((r) => (
            <li key={r} className="flex items-start gap-3 rounded-xl border border-line bg-slate-50/60 px-4 py-3.5 text-sm font-semibold leading-relaxed text-ink-soft">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-aqua-500" />
              {r}
            </li>
          ))}
        </ul>
        <Notice tone="warn" className="mt-4">These statements are generated from the illustrative simulation. Validate any shelter design with a qualified engineer and a real thermal model before building.</Notice>
      </Card>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => { setDesign(c.design); toast(`${c.label} is now your working design.`) ; nav('/design') }}><Upload size={15} /> Apply to my design</button>
        <button className="btn-outline" onClick={() => { const prev = design; setDesign(c.design); const r = saveDesign(`${c.label} · ${c.tag}`); setDesign(prev); toast(r.message, r.ok ? 'success' : 'error') }}><Bookmark size={15} /> Save to comparison</button>
        <button className="btn-outline" onClick={() => { setDesign(c.design); nav('/whatif') }}><Scale size={15} /> Explore what-if</button>
      </div>

      <StepNav back="/optimize" backLabel="Optimization" next="/report" nextLabel="Export report" />
    </>
  )
}
