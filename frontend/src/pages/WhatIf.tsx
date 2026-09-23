import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bookmark, Link2, RotateCcw, Upload } from 'lucide-react'
import { WhatIfChart } from '../components/charts/WhatIfChart'
import { DemoBadge } from '../components/common/Badges'
import { Card, CardHeader } from '../components/common/Card'
import { Delta } from '../components/common/Delta'
import { SliderField } from '../components/common/Field'
import { toast } from '../components/common/Toaster'
import { PageHeader } from '../components/layout/PageHeader'
import { ShelterStage } from '../components/shelter/ShelterStage'
import { MATERIALS, getMaterial, materialsForRole } from '../data/materials'
import { runMockSimulation } from '../data/mockSimulation'
import { useProjectStore } from '../store/useProjectStore'
import type { ShelterDesign } from '../types/shelter'
import { bearingLabel, clamp, deriveGeometry, withWindowArea } from '../utils/geometry'

/** A sensible "try this" starting point: only levers that apply to the current design. */
function suggest(d: ShelterDesign, cold: boolean): ShelterDesign {
  let m = { ...d }
  m.wallThickness = clamp(Math.round((d.wallThickness * 1.5) / 10) * 10, getMaterial(d.wallMaterial).thicknessRange[0], getMaterial(d.wallMaterial).thicknessRange[1])
  if (d.type === 'rectangular' && d.roofAngle < 5) m.roofAngle = 35
  if (Math.abs(((d.orientation - 180 + 540) % 360) - 180) > 12) m.orientation = 180
  if (d.massThickness < 150) m.massThickness = 150
  // Cold sites want more (south) sun; hot sites want less.
  m = withWindowArea(m, Math.max(0.6, deriveGeometry(d).windowArea * (cold ? 1.6 : 0.6)))
  return m
}

const fmtChange = (k: string, a: ShelterDesign, b: ShelterDesign): { label: string; from: string; to: string } | null => {
  const ga = deriveGeometry(a)
  const gb = deriveGeometry(b)
  const rows: Record<string, { label: string; from: string; to: string; same: boolean }> = {
    wall: { label: 'Wall', from: `${a.wallThickness} mm`, to: `${b.wallThickness} mm`, same: a.wallThickness === b.wallThickness },
    roofT: { label: 'Roof insulation', from: `${a.roofThickness} mm`, to: `${b.roofThickness} mm`, same: a.roofThickness === b.roofThickness },
    window: { label: 'Window', from: `${ga.windowArea.toFixed(1)} m²`, to: `${gb.windowArea.toFixed(1)} m²`, same: Math.abs(ga.windowArea - gb.windowArea) < 0.05 },
    roof: { label: 'Roof', from: a.roofAngle <= 0 ? 'Flat' : `${a.roofAngle}°`, to: b.roofAngle <= 0 ? 'Flat' : `${b.roofAngle}°`, same: a.roofAngle === b.roofAngle },
    orient: { label: 'Orientation', from: `${Math.round(a.orientation)}° ${bearingLabel(a.orientation)}`, to: `${Math.round(b.orientation)}° ${bearingLabel(b.orientation)}`, same: Math.round(a.orientation) === Math.round(b.orientation) },
    mass: { label: 'Thermal mass', from: a.massThickness ? `${a.massThickness} mm` : 'None', to: b.massThickness ? `${b.massThickness} mm` : 'None', same: a.massThickness === b.massThickness && a.thermalMassMaterial === b.thermalMassMaterial },
    wallMat: { label: 'Wall material', from: getMaterial(a.wallMaterial).name, to: getMaterial(b.wallMaterial).name, same: a.wallMaterial === b.wallMaterial },
    glazing: { label: 'Glazing', from: getMaterial(a.windowMaterial).name, to: getMaterial(b.windowMaterial).name, same: a.windowMaterial === b.windowMaterial },
    height: { label: 'Height', from: `${a.height.toFixed(1)} m`, to: `${b.height.toFixed(1)} m`, same: a.height === b.height },
  }
  const r = rows[k]
  return r && !r.same ? r : null
}

export default function WhatIf() {
  const design = useProjectStore((s) => s.design)
  const stored = useProjectStore((s) => s.whatIfDesign)
  const setWhatIf = useProjectStore((s) => s.setWhatIfDesign)
  const setDesign = useProjectStore((s) => s.setDesign)
  const save = useProjectStore((s) => s.saveCurrentDesign)
  const weather = useProjectStore((s) => s.weather)
  const settings = useProjectStore((s) => s.settings)
  const [sync, setSync] = useState(true)

  const cold = weather.hourly.reduce((a, h) => a + h.temperature, 0) / 24 < 15
  useEffect(() => { if (!stored) setWhatIf(suggest(design, cold)) }, [stored, design, cold, setWhatIf])
  const mod = stored ?? suggest(design, cold)
  const patch = (p: Partial<ShelterDesign>) => setWhatIf({ ...mod, ...p })

  const cur = useMemo(() => runMockSimulation({ design, weather, settings }), [design, weather, settings])
  const modR = useMemo(() => runMockSimulation({ design: mod, weather, settings }), [mod, weather, settings])
  const geoMod = useMemo(() => deriveGeometry(mod), [mod])
  const changes = ['wall', 'roofT', 'window', 'roof', 'orient', 'mass', 'wallMat', 'glazing', 'height'].map((k) => fmtChange(k, design, mod)).filter(Boolean) as { label: string; from: string; to: string }[]

  const metrics: { label: string; a: number; b: number; better: 'high' | 'low'; unit: string; d: number }[] = [
    { label: 'Avg indoor temperature', a: cur.metrics.avgIndoor, b: modR.metrics.avgIndoor, better: 'high', unit: '°C', d: 1 },
    { label: 'Heat loss', a: cur.metrics.heatLossKWh, b: modR.metrics.heatLossKWh, better: 'low', unit: 'kWh', d: 1 },
    { label: 'Solar gain', a: cur.metrics.solarGainKWh, b: modR.metrics.solarGainKWh, better: 'high', unit: 'kWh', d: 1 },
    { label: 'Comfort hours', a: cur.metrics.comfortHours, b: modR.metrics.comfortHours, better: 'high', unit: 'h', d: 1 },
    { label: 'Energy requirement', a: cur.metrics.energyKWh, b: modR.metrics.energyKWh, better: 'low', unit: 'kWh', d: 1 },
  ]

  const wm = getMaterial(mod.wallMaterial)
  const chips: [string, () => void][] = [
    ['Thicker walls +40 mm', () => patch({ wallThickness: clamp(mod.wallThickness + 40, wm.thicknessRange[0], wm.thicknessRange[1]) })],
    ['Smaller windows −30%', () => setWhatIf(withWindowArea(mod, Math.max(0.5, geoMod.windowArea * 0.7)))],
    ['Larger south glazing +30%', () => setWhatIf(withWindowArea(mod, geoMod.windowArea * 1.3))],
    ['Face south', () => patch({ orientation: 180 })],
    ['Add thermal mass', () => patch({ massThickness: Math.max(mod.massThickness, 150), thermalMassMaterial: mod.massThickness ? mod.thermalMassMaterial : 'water' })],
    ['Triple glazing', () => patch({ windowMaterial: 'triple-lowe' })],
  ]

  return (
    <>
      <PageHeader eyebrow="Tool · What if?" title="What if we changed…?" subtitle="Two shelters, one climate. Edit the modified design and watch the simulated metrics — and the 3D model — respond." actions={<DemoBadge />} />

      <div className="relative mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3"><span className="eyebrow !text-brand-700">Current design</span><span className="num text-xs font-bold text-ink-mute">{cur.metrics.comfortHours.toFixed(0)} h comfort</span></div>
          <ShelterStage design={design} compact syncId={sync ? 'whatif' : undefined} defaults={{ dims: false, sunPath: false }} className="!rounded-none !border-0 h-[380px]" caption="Current" />
        </Card>
        <Card className="overflow-hidden !border-aqua-300">
          <div className="flex items-center justify-between border-b border-line px-5 py-3"><span className="eyebrow !text-aqua-700">Modified design</span><span className="num text-xs font-bold text-ink-mute">{modR.metrics.comfortHours.toFixed(0)} h comfort</span></div>
          <ShelterStage design={mod} compact syncId={sync ? 'whatif' : undefined} defaults={{ dims: false, sunPath: false }} className="!rounded-none !border-0 h-[380px]" caption="Modified" />
        </Card>
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-ink text-xs font-extrabold tracking-wider text-white shadow-pop">VS</span>
        </div>
        <button onClick={() => setSync(!sync)} aria-pressed={sync} className={`absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-card backdrop-blur lg:flex ${sync ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-mute'}`}>
          <Link2 size={13} /> {sync ? 'Cameras linked' : 'Cameras independent'}
        </button>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader eyebrow="Levers" title="Modify the design" action={<button className="btn-ghost btn-sm" onClick={() => setWhatIf({ ...design })}><RotateCcw size={13} /> Match current</button>} />
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap gap-2">
              {chips.map(([t, fn]) => <button key={t} onClick={fn} className="chip transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">{t}</button>)}
            </div>
            <SliderField label="Wall thickness" value={mod.wallThickness} min={wm.thicknessRange[0]} max={wm.thicknessRange[1]} step={wm.thicknessRange[1] > 50 ? 5 : 1} unit="mm" onChange={(v) => patch({ wallThickness: v })} />
            <SliderField label="Window area" value={+geoMod.windowArea.toFixed(2)} min={0.4} max={8} step={0.1} unit="m²" onChange={(v) => setWhatIf(withWindowArea(mod, v))} />
            <SliderField label="Roof angle" term="roof-angle" value={mod.roofAngle} min={0} max={75} step={1} unit="°" disabled={mod.type === 'dome'} onChange={(v) => patch({ roofAngle: v })} hint={mod.type === 'rectangular' ? '0° = flat' : undefined} />
            <SliderField label="Orientation" term="orientation" value={Math.round(mod.orientation)} min={0} max={359} step={1} unit="°" onChange={(v) => patch({ orientation: v })} />
            <SliderField label="Thermal mass thickness" term="thermal-mass" value={mod.massThickness} min={0} max={400} step={10} unit="mm" onChange={(v) => patch({ massThickness: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="wi-wall">Wall material</label>
                <select id="wi-wall" className="input" value={mod.wallMaterial} onChange={(e) => { const m = getMaterial(e.target.value); patch({ wallMaterial: m.id, wallThickness: clamp(mod.wallThickness, m.thicknessRange[0], m.thicknessRange[1]) }) }}>
                  {materialsForRole('wall').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="wi-glass">Glazing</label>
                <select id="wi-glass" className="input" value={mod.windowMaterial} onChange={(e) => patch({ windowMaterial: e.target.value })}>
                  {MATERIALS.filter((m) => m.roles.includes('window')).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="What changed" title={changes.length ? `${changes.length} change${changes.length > 1 ? 's' : ''}` : 'No changes yet'} />
            <div className="p-5 pt-4">
              {changes.length === 0 ? <p className="text-sm font-medium text-ink-mute">Adjust a lever or pick a quick change.</p> : (
                <ul className="space-y-2">
                  {changes.map((c) => (
                    <li key={c.label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-semibold">
                      <span className="w-32 shrink-0 text-ink-mute">{c.label}</span>
                      <span className="num text-ink-soft line-through decoration-slate-300">{c.from}</span>
                      <ArrowRight size={14} className="shrink-0 text-brand-500" />
                      <span className="num font-bold text-brand-700">{c.to}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <Card>
            <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-3 border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-mute">
              <span>Metric</span><span className="text-right">Current</span><span className="text-right">Modified</span><span className="text-right">Change</span>
            </div>
            {metrics.map((m) => (
              <div key={m.label} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center gap-x-3 border-b border-line/70 px-5 py-3 last:border-0">
                <span className="text-[13px] font-bold">{m.label}</span>
                <span className="num text-right text-sm font-semibold text-ink-soft">{m.a.toFixed(m.d)}</span>
                <span className="num text-right text-sm font-bold">{m.b.toFixed(m.d)} <span className="text-[10px] font-semibold text-ink-mute">{m.unit}</span></span>
                <span className="text-right"><Delta value={m.b} base={m.a} better={m.better} digits={m.d} /></span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="mb-6"><WhatIfChart current={cur.hourly} modified={modR.hourly} comfortMin={settings.comfortMin} comfortMax={settings.comfortMax} /></div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => { setDesign(mod); toast('Modified design applied to your project.') }}><Upload size={15} /> Apply modified design</button>
        <button className="btn-outline" onClick={() => { const prev = design; setDesign(mod); const r = save('What-if variant'); setDesign(prev); toast(r.message, r.ok ? 'success' : 'error') }}><Bookmark size={15} /> Save modified to comparison</button>
      </div>
    </>
  )
}
