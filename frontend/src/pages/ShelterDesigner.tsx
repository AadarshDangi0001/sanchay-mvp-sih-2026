import { useMemo } from 'react'
import { Bookmark, RotateCcw } from 'lucide-react'
import { Card, CardHeader } from '../components/common/Card'
import { FieldError, NumberInput, SliderField } from '../components/common/Field'
import { Term } from '../components/common/Term'
import { toast } from '../components/common/Toaster'
import { Notice } from '../components/common/Badges'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { OrientationDial } from '../components/shelter/OrientationDial'
import { ShapePicker } from '../components/shelter/ShapePicker'
import { ShelterStage } from '../components/shelter/ShelterStage'
import { getMaterial } from '../data/materials'
import { useProjectStore } from '../store/useProjectStore'
import type { ShelterDesign } from '../types/shelter'
import {
  COMPASS, DESIGN_LIMITS, applyTypePreset, bearingLabel, deriveGeometry, validateDesign, withWindowArea,
  type DesignIssue, type NumericKey,
} from '../utils/geometry'

export function MaterialLegend({ design }: { design: ShelterDesign }) {
  const items = [
    ['Walls', design.wallMaterial], ['Roof', design.roofMaterial], ['Floor', design.floorMaterial], ['Glazing', design.windowMaterial], ['Mass', design.thermalMassMaterial],
  ] as const
  return (
    <div className="absolute left-4 top-12 z-10 hidden max-w-[210px] rounded-xl border border-line bg-white/90 p-2.5 shadow-card backdrop-blur sm:block">
      <div className="eyebrow mb-1.5 !text-[9px]">Material preview</div>
      <ul className="space-y-1">
        {items.map(([k, id]) => {
          const m = getMaterial(id)
          return (
            <li key={k} className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="h-3.5 w-3.5 shrink-0 rounded-[4px] border border-black/10" style={{ background: m.color }} />
              <span className="w-11 text-ink-mute">{k}</span>
              <span className="truncate text-ink-soft">{m.name}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function ShelterDesigner() {
  useVisit('design')
  const design = useProjectStore((s) => s.design)
  const update = useProjectStore((s) => s.updateDesign)
  const setDesign = useProjectStore((s) => s.setDesign)
  const reset = useProjectStore((s) => s.resetDesign)
  const save = useProjectStore((s) => s.saveCurrentDesign)
  const weather = useProjectStore((s) => s.weather)

  const geo = useMemo(() => deriveGeometry(design), [design])
  const issues = useMemo(() => validateDesign(design), [design])
  const issueFor = (k: NumericKey): DesignIssue | undefined => issues.find((i) => i.field === k)
  const L = DESIGN_LIMITS

  const slider = (key: NumericKey, opts: { label?: string; term?: string; disabled?: boolean; hint?: string } = {}) => (
    <SliderField
      label={opts.label ?? L[key].label} term={opts.term} value={design[key] as number}
      min={L[key].min} max={L[key].max} step={L[key].step} unit={L[key].unit} onChange={(v) => update({ [key]: v })}
      issue={issueFor(key)?.message} issueLevel={issueFor(key)?.level} disabled={opts.disabled} hint={opts.hint}
    />
  )
  const general = issues.filter((i) => i.field === 'general')
  const errors = issues.filter((i) => i.level === 'error')

  const windowArea = geo.windowArea
  const stats: [string, string, string?][] = [
    ['Floor area', `${geo.floorArea.toFixed(1)} m²`],
    ['Volume', `${geo.volume.toFixed(1)} m³`],
    ['Envelope area', `${geo.envelopeArea.toFixed(0)} m²`],
    ['Glazing', `${windowArea.toFixed(2)} m² · ${(geo.wwr * 100).toFixed(0)}%`, 'wwr'],
    ['Envelope / volume', `${geo.surfaceToVolume.toFixed(2)} m⁻¹`, 'surface-volume'],
    ['Ridge height', `${geo.ridgeHeight.toFixed(2)} m`],
  ]

  return (
    <>
      <PageHeader
        step="design"
        title="Design the shelter"
        subtitle="One parametric design object drives everything: the 3D model, the simulation, comparison and optimization. Move a slider — the model rebuilds instantly."
        actions={
          <>
            <button className="btn-outline" onClick={() => { reset(); toast('Design reset to the project defaults.', 'info') }}><RotateCcw size={15} /> Reset design</button>
            <button className="btn-primary" onClick={() => { const r = save(); toast(r.message, r.ok ? 'success' : 'error') }}><Bookmark size={15} /> Save design</button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]">
        <div className="space-y-5 lg:max-h-none">
          <Card>
            <CardHeader eyebrow="01" title="Shape" />
            <div className="p-5"><ShapePicker value={design.type} onChange={(t) => setDesign(applyTypePreset(design, t))} /></div>
          </Card>

          <Card>
            <CardHeader eyebrow="02" title="Dimensions" />
            <div className="space-y-5 p-5">
              {slider('length')}
              {slider('width')}
              {slider('height', { label: design.type === 'rectangular' ? 'Wall (eave) height' : 'Height' })}
              {slider('roofAngle', { term: 'roof-angle', disabled: design.type === 'dome', hint: design.type === 'dome' ? 'A dome’s curvature sets its own pitch.' : design.type === 'rectangular' ? '0° = flat roof' : undefined })}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="03" title={<Term k="orientation">Orientation</Term>} />
            <div className="p-5">
              <div className="flex items-center gap-4">
                <OrientationDial value={Math.round(design.orientation)} onChange={(v) => update({ orientation: v })} latitude={weather.latitude} dayOfYear={weather.dayOfYear} />
                <div className="min-w-0 flex-1">
                  <div className="num text-3xl font-bold leading-none">{Math.round(design.orientation)}°</div>
                  <div className="mt-1 text-sm font-bold text-brand-700">Facing {bearingLabel(design.orientation)}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {COMPASS.map((c) => (
                      <button key={c.label} onClick={() => update({ orientation: c.deg })} className={`num h-8 w-8 rounded-lg border text-xs font-bold transition ${Math.round(design.orientation) === c.deg ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink-soft hover:border-brand-300'}`}>{c.label}</button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] font-medium leading-snug text-ink-mute">Drag the compass. The <span className="font-bold text-amber-600">amber arc</span> is the sun’s path on the design day; the <span className="font-bold text-aqua-600">cyan edge</span> is the glazed front.</p>
                </div>
              </div>
              <div className="mt-4"><SliderField label="Bearing" value={Math.round(design.orientation)} min={0} max={359} step={1} unit="°" onChange={(v) => update({ orientation: v })} /></div>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="04" title="Openings" action={<span className="chip num !bg-aqua-50 !text-aqua-700">{windowArea.toFixed(2)} m² glazing</span>} />
            <div className="space-y-5 p-5">
              {slider('windowCount')}
              {slider('windowWidth')}
              {slider('windowHeight')}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <label className="text-[13px] font-semibold text-ink-soft">Set total window area</label>
                <NumberInput value={+windowArea.toFixed(2)} min={0.3} max={12} step={0.1} unit="m²" onChange={(v) => setDesign(withWindowArea(design, v))} className="w-[110px]" ariaLabel="Total window area" />
              </div>
              <div className="border-t border-line pt-5">{slider('doorWidth')}</div>
              {slider('doorHeight')}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Checks" title="Design validation" />
            <div className="space-y-2 p-5">
              {issues.length === 0 && <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">✓ All parameters are consistent.</div>}
              {errors.map((i, n) => <Notice key={`e${n}`} tone="error">{i.message}</Notice>)}
              {issues.filter((i) => i.level === 'warn').map((i, n) => <Notice key={`w${n}`} tone="warn">{i.message}</Notice>)}
              {general.length === 0 && issues.length > 0 && null}
              <FieldError message={undefined} />
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <ShelterStage
            design={design}
            className="h-[62vh] min-h-[480px] lg:h-[calc(100vh-15rem)]"
            caption={<>Live parametric model · {design.type} · {design.length.toFixed(1)} × {design.width.toFixed(1)} × {design.height.toFixed(1)} m</>}
            overlay={<MaterialLegend design={design} />}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            {stats.map(([k, v, term]) => (
              <div key={k} className="card px-3.5 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{term ? <Term k={term}>{k}</Term> : k}</div>
                <div className="num mt-0.5 text-[15px] font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <StepNav back="/climate" next="/materials" nextLabel="Choose materials" backLabel="Climate" disabled={errors.length > 0} hint={errors.length ? 'Fix the highlighted errors to continue' : undefined} />
    </>
  )
}
