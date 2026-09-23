import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Card, CardHeader } from '../components/common/Card'
import { SliderField } from '../components/common/Field'
import { Term } from '../components/common/Term'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { ShelterStage } from '../components/shelter/ShelterStage'
import { MATERIALS, getMaterial, materialsForRole } from '../data/materials'
import { buildEnvelope } from '../data/mockSimulation'
import { useProjectStore } from '../store/useProjectStore'
import type { Material, MaterialRole } from '../types/material'
import type { ShelterDesign } from '../types/shelter'
import { clamp, deriveGeometry } from '../utils/geometry'
import { summarizeWeather } from '../utils/thermal'
import { LOSS_COLOR } from '../components/charts/ResultsCharts'

type SlotId = 'wall' | 'roof' | 'floor' | 'window' | 'mass'
const SLOTS: { id: SlotId; label: string; key: keyof ShelterDesign; thick: keyof ShelterDesign | null; role: MaterialRole }[] = [
  { id: 'wall', label: 'Walls', key: 'wallMaterial', thick: 'wallThickness', role: 'wall' },
  { id: 'roof', label: 'Roof', key: 'roofMaterial', thick: 'roofThickness', role: 'roof' },
  { id: 'floor', label: 'Floor', key: 'floorMaterial', thick: 'floorThickness', role: 'floor' },
  { id: 'window', label: 'Windows', key: 'windowMaterial', thick: null, role: 'window' },
  { id: 'mass', label: 'Thermal mass', key: 'thermalMassMaterial', thick: 'massThickness', role: 'mass' },
]

const log = (v: number, lo: number, hi: number) => (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))
const PROPS: { key: string; label: string; term: string; unit: string; get: (m: Material) => number; norm: (m: Material) => number; digits: number }[] = [
  { key: 'k', label: 'Thermal conductivity', term: 'conductivity', unit: 'W/m·K', get: (m) => m.conductivity, norm: (m) => clamp(log(m.conductivity, 0.02, 250), 0.02, 1), digits: 3 },
  { key: 'rho', label: 'Density', term: 'density', unit: 'kg/m³', get: (m) => m.density, norm: (m) => clamp(log(m.density, 20, 3000), 0.02, 1), digits: 0 },
  { key: 'cp', label: 'Specific heat', term: 'specific-heat', unit: 'J/kg·K', get: (m) => m.specificHeat, norm: (m) => clamp((m.specificHeat - 600) / 3700, 0.02, 1), digits: 0 },
  { key: 'eps', label: 'Emissivity', term: 'emissivity', unit: '', get: (m) => m.emissivity, norm: (m) => m.emissivity, digits: 2 },
  { key: 'abs', label: 'Absorptivity', term: 'absorptivity', unit: '', get: (m) => m.absorptivity, norm: (m) => m.absorptivity, digits: 2 },
]

export default function Materials() {
  useVisit('materials')
  const design = useProjectStore((s) => s.design)
  const update = useProjectStore((s) => s.updateDesign)
  const settings = useProjectStore((s) => s.settings)
  const weather = useProjectStore((s) => s.weather)
  const [slotId, setSlotId] = useState<SlotId>('wall')
  const slot = SLOTS.find((s) => s.id === slotId)!
  const selected = getMaterial(design[slot.key] as string)
  const options = materialsForRole(slot.role)
  const thickness = slot.thick ? (design[slot.thick] as number) : selected.thickness

  const env = useMemo(() => {
    const geo = deriveGeometry(design)
    return buildEnvelope(geo, settings, summarizeWeather(weather).meanWind)
  }, [design, settings, weather])

  const choose = (m: Material) => {
    const patch: Partial<ShelterDesign> = { [slot.key]: m.id }
    if (slot.thick) {
      const cur = design[slot.thick] as number
      const base = slot.id === 'mass' && cur === 0 ? m.thickness : m.thickness
      patch[slot.thick] = clamp(base, m.thicknessRange[0], m.thicknessRange[1]) as never
      if (slot.id === 'mass' && cur > 0) patch[slot.thick] = clamp(cur, m.thicknessRange[0], m.thicknessRange[1]) as never
    }
    update(patch)
  }

  const layerU = env.summary.uValue
  const uRows: { key: keyof typeof layerU; label: string; color: string; term?: boolean }[] = [
    { key: 'walls', label: 'Walls', color: LOSS_COLOR.walls },
    { key: 'roof', label: 'Roof', color: LOSS_COLOR.roof },
    { key: 'floor', label: 'Floor', color: LOSS_COLOR.floor },
    { key: 'windows', label: 'Windows', color: LOSS_COLOR.windows },
    { key: 'door', label: 'Door', color: LOSS_COLOR.door },
  ]
  const maxU = Math.max(...uRows.map((r) => layerU[r.key]))

  return (
    <>
      <PageHeader step="materials" title="Choose the envelope materials" subtitle="Five assemblies define how the shelter holds heat. Pick a material for each, set its thickness, and watch the preview and U-values respond." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 2xl:grid-cols-5">
            {SLOTS.map((s) => {
              const m = getMaterial(design[s.key] as string)
              const active = s.id === slotId
              return (
                <button key={s.id} onClick={() => setSlotId(s.id)} aria-pressed={active}
                  className={`card p-3 text-left transition hover:-translate-y-0.5 ${active ? '!border-brand-500 ring-2 ring-brand-100' : 'hover:border-brand-300'}`}>
                  <div className="eyebrow mb-2 !text-[10px]">{s.label}</div>
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 shrink-0 rounded-lg border border-black/10" style={{ background: m.color }} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-bold leading-tight">{m.name}</div>
                      <div className="num text-[11px] font-semibold text-ink-mute">{s.thick ? `${design[s.thick]} mm` : `${m.thickness} mm unit`}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <Card>
            <CardHeader eyebrow={`Material database · ${slot.label}`} title={`${options.length} options for ${slot.label.toLowerCase()}`} />
            <div className="grid gap-2.5 p-5 sm:grid-cols-2">
              {options.map((m) => {
                const on = m.id === selected.id
                return (
                  <button key={m.id} onClick={() => choose(m)} aria-pressed={on}
                    className={`relative rounded-xl border p-3.5 text-left transition ${on ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100' : 'border-line bg-white hover:border-brand-300'}`}>
                    {on && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} strokeWidth={3.5} /></span>}
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 rounded-xl border border-black/10 shadow-inner" style={{ background: m.color }} />
                      <div className="min-w-0 pr-5">
                        <div className="text-sm font-bold leading-tight">{m.name}</div>
                        <div className="text-[11px] font-semibold text-ink-mute">{m.category}</div>
                      </div>
                    </div>
                    <div className="num mt-2.5 flex gap-3 text-[11px] font-semibold text-ink-soft">
                      <span>k {m.conductivity}</span><span>ρ {m.density}</span><span>cp {m.specificHeat}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Properties" title={selected.name} action={<span className="chip">{selected.category}</span>} />
            <div className="p-5">
              <p className="mb-4 text-sm font-medium leading-relaxed text-ink-soft">{selected.description}</p>
              <dl className="space-y-3">
                {PROPS.map((p) => (
                  <div key={p.key} className="grid grid-cols-[150px_1fr_110px] items-center gap-3">
                    <dt className="text-[13px] font-semibold text-ink-soft"><Term k={p.term}>{p.label}</Term></dt>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${p.norm(selected) * 100}%` }} /></div>
                    <dd className="num text-right text-sm font-bold">{p.get(selected).toFixed(p.digits)} <span className="text-[11px] font-semibold text-ink-mute">{p.unit}</span></dd>
                  </div>
                ))}
                {selected.shgc !== undefined && (
                  <div className="grid grid-cols-[150px_1fr_110px] items-center gap-3">
                    <dt className="text-[13px] font-semibold text-ink-soft"><Term k="shgc">Solar heat gain (SHGC)</Term></dt>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${selected.shgc * 100}%` }} /></div>
                    <dd className="num text-right text-sm font-bold">{selected.shgc.toFixed(2)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-5 border-t border-line pt-5">
                {slot.thick ? (
                  <SliderField
                    label={`${slot.label} thickness`} value={thickness} min={slot.id === 'mass' ? 0 : selected.thicknessRange[0]} max={selected.thicknessRange[1]}
                    step={selected.thicknessRange[1] > 50 ? 5 : 1} unit="mm" onChange={(v) => update({ [slot.thick!]: v } as Partial<ShelterDesign>)}
                    hint={slot.id === 'mass' ? '0 mm removes the thermal-mass layer.' : `Typical: ${selected.thickness} mm`}
                  />
                ) : (
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-ink-soft">Glazing unit thickness</span>
                    <span className="num font-bold">{selected.thickness} mm <span className="text-ink-mute">(fixed by the unit)</span></span>
                  </div>
                )}
                {slot.id !== 'window' && slot.id !== 'mass' && (
                  <div className="num mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-[13px] font-semibold">
                    <span className="text-ink-soft">Layer R-value</span>
                    <span className="font-bold">{(thickness / 1000 / selected.conductivity).toFixed(2)} m²K/W</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-[88px] xl:self-start">
          <ShelterStage design={design} compact defaults={{ dims: false, sunPath: false }} className="h-[52vh] min-h-[380px]" caption="Material preview · drag to orbit" />
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold tracking-tight"><Term k="u-value">U-value</Term> of each assembly</h3>
              <span className="text-[11px] font-semibold text-ink-mute">W/m²K · lower is better</span>
            </div>
            <div className="space-y-2.5">
              {uRows.map((r) => (
                <div key={String(r.key)} className="grid grid-cols-[70px_1fr_56px] items-center gap-3">
                  <span className="text-[13px] font-semibold text-ink-soft">{r.label}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(layerU[r.key] / maxU) * 100}%`, background: r.color }} /></div>
                  <span className="num text-right text-sm font-bold">{layerU[r.key].toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-line pt-4">
              {[
                ['Total UA', `${env.summary.totalUA.toFixed(0)} W/K`, 'heat-loss'],
                ['Capacity', `${(env.summary.capacity / 1000).toFixed(1)} kWh/K`, 'thermal-mass'],
                ['Time const.', `${env.summary.timeConstant.toFixed(0)} h`, 'time-constant'],
              ].map(([k, v, t]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute"><Term k={t}>{k}</Term></div>
                  <div className="num text-[14px] font-bold">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <StepNav back="/design" next="/simulation" nextLabel="Simulation settings" backLabel="Design" hint={`${MATERIALS.length} materials in the mock database`} />
    </>
  )
}
