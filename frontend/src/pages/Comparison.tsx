import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, Check, GitCompare, Pencil, Trash2, Upload } from 'lucide-react'
import { ComparisonBars, ComparisonRadar, COMPARE_METRICS, itemColor, type CompareItem } from '../components/charts/ComparisonCharts'
import { DemoBadge, Notice } from '../components/common/Badges'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { toast } from '../components/common/Toaster'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { ShelterViewer } from '../components/shelter3d/ShelterViewer'
import { getMaterial } from '../data/materials'
import { MAX_SAVED_DESIGNS, useProjectStore } from '../store/useProjectStore'
import type { SavedDesign } from '../types/simulation'
import { SHELTER_TYPES, bearingLabel, deriveGeometry } from '../utils/geometry'

export function ShelterThumb({ design, className = 'h-40' }: { design: SavedDesign['design']; className?: string }) {
  return (
    <ShelterViewer
      design={design} quality="low" shadows={false} showGrid={false} showCompass={false} showSunPath={false}
      autoRotate interactive={false} className={`!rounded-xl !border-0 ${className}`}
    />
  )
}

function NameEditor({ d }: { d: SavedDesign }) {
  const rename = useProjectStore((s) => s.renameSavedDesign)
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(d.name)
  if (!editing)
    return (
      <button className="group flex min-w-0 items-center gap-1.5 text-left" onClick={() => { setV(d.name); setEditing(true) }} title="Rename">
        <span className="truncate text-[14px] font-bold">{d.name}</span>
        <Pencil size={12} className="shrink-0 text-slate-300 group-hover:text-brand-600" />
      </button>
    )
  const done = () => { rename(d.id, v); setEditing(false) }
  return (
    <input
      autoFocus className="input !py-1 text-sm font-bold" value={v} maxLength={48}
      onChange={(e) => setV(e.target.value)} onBlur={done} onKeyDown={(e) => { if (e.key === 'Enter') done(); if (e.key === 'Escape') setEditing(false) }}
    />
  )
}

export default function Comparison() {
  useVisit('compare')
  const nav = useNavigate()
  const saved = useProjectStore((s) => s.savedDesigns)
  const save = useProjectStore((s) => s.saveCurrentDesign)
  const remove = useProjectStore((s) => s.removeSavedDesign)
  const load = useProjectStore((s) => s.loadSavedDesign)
  const items: CompareItem[] = saved.map((d) => ({ id: d.id, name: d.name, metrics: d.metrics }))
  const full = saved.length >= MAX_SAVED_DESIGNS

  const best = (key: (typeof COMPARE_METRICS)[number]['key'], better: 'high' | 'low') => {
    if (saved.length < 2) return -1
    const vals = saved.map((d) => d.metrics[key] as number)
    const t = better === 'high' ? Math.max(...vals) : Math.min(...vals)
    return vals.findIndex((v) => v === t)
  }
  const rowsSpec: { label: string; cell: (d: SavedDesign) => string }[] = [
    { label: 'Shape', cell: (d) => SHELTER_TYPES.find((t) => t.id === d.design.type)!.label },
    { label: 'Dimensions (L×W×H)', cell: (d) => `${d.design.length.toFixed(1)} × ${d.design.width.toFixed(1)} × ${d.design.height.toFixed(1)} m` },
    { label: 'Roof · orientation', cell: (d) => `${deriveGeometry(d.design).roofAngleEff.toFixed(0)}° · ${Math.round(d.design.orientation)}° ${bearingLabel(d.design.orientation)}` },
    { label: 'Glazing area', cell: (d) => `${deriveGeometry(d.design).windowArea.toFixed(1)} m²` },
    { label: 'Walls', cell: (d) => `${getMaterial(d.design.wallMaterial).name} ${d.design.wallThickness} mm` },
    { label: 'Roof', cell: (d) => `${getMaterial(d.design.roofMaterial).name} ${d.design.roofThickness} mm` },
    { label: 'Windows · mass', cell: (d) => `${getMaterial(d.design.windowMaterial).name} · ${d.design.massThickness > 0 ? getMaterial(d.design.thermalMassMaterial).name : 'no mass'}` },
  ]

  return (
    <>
      <PageHeader
        step="compare" title="Compare designs"
        subtitle={`Save 3–4 variants and compare them side by side under the same weather. ${saved.length}/${MAX_SAVED_DESIGNS} saved.`}
        actions={
          <>
            <DemoBadge className="hidden md:inline-flex" />
            <button className="btn-primary" disabled={full} onClick={() => { const r = save(); toast(r.message, r.ok ? 'success' : 'error') }}>
              <Bookmark size={16} /> Save Current Design
            </button>
          </>
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={<GitCompare size={26} />} title="No saved designs yet"
          body="Tweak the design, click “Save Current Design”, change something, and save again. Each save stores the shelter and its simulated metrics."
          action={<div className="flex gap-2"><Link to="/design" className="btn-outline">Open the editor</Link><button className="btn-primary" onClick={() => { const r = save(); toast(r.message, r.ok ? 'success' : 'error') }}><Bookmark size={15} /> Save current design</button></div>}
        />
      ) : (
        <>
          {saved.length < 3 && <Notice tone="info" className="mb-5">Save at least 3 designs for a meaningful comparison — you have {saved.length}.</Notice>}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {saved.map((d, i) => (
              <Card key={d.id} className="flex flex-col overflow-hidden">
                <div className="relative bg-[#eaf1fa] p-2">
                  <ShelterThumb design={d.design} />
                  <span className="num absolute left-4 top-4 grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold text-white" style={{ background: itemColor(i) }}>{i + 1}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <NameEditor d={d} />
                  <p className="num mt-1 text-[11px] font-semibold text-ink-mute">{SHELTER_TYPES.find((t) => t.id === d.design.type)!.label} · {d.design.length.toFixed(1)}×{d.design.width.toFixed(1)}×{d.design.height.toFixed(1)} m</p>
                  <dl className="num mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    {[['Avg indoor', `${d.metrics.avgIndoor.toFixed(1)}°C`], ['Comfort', `${d.metrics.comfortHours.toFixed(0)} h`], ['Heat loss', `${d.metrics.heatLossKWh.toFixed(1)} kWh`], ['Energy', `${d.metrics.energyKWh.toFixed(1)} kWh`]].map(([k, v]) => (
                      <div key={k}><dt className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{k}</dt><dd className="font-bold">{v}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-4 flex gap-2 pt-1">
                    <button className="btn-outline btn-sm flex-1" onClick={() => { load(d.id); toast('Loaded into the editor.', 'info'); nav('/design') }}><Upload size={13} /> Load</button>
                    <button className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-line text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${d.name}`} onClick={() => remove(d.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </Card>
            ))}
            {!full && (
              <button onClick={() => { const r = save(); toast(r.message, r.ok ? 'success' : 'error') }} className="grid min-h-[260px] place-items-center rounded-2xl border-2 border-dashed border-line bg-white/60 text-center transition hover:border-brand-300 hover:bg-brand-50/50">
                <span><Bookmark className="mx-auto mb-2 text-brand-500" /><span className="block text-sm font-bold">Save current design</span><span className="block text-xs font-medium text-ink-mute">{MAX_SAVED_DESIGNS - saved.length} slot{MAX_SAVED_DESIGNS - saved.length === 1 ? '' : 's'} left</span></span>
              </button>
            )}
          </div>

          <Card className="mb-8 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="w-[190px] px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-mute">Comparison</th>
                  {saved.map((d, i) => (
                    <th key={d.id} className="px-4 py-4 align-bottom">
                      <div className="flex items-center gap-2"><span className="num grid h-5 w-5 place-items-center rounded text-[10px] font-bold text-white" style={{ background: itemColor(i) }}>{i + 1}</span><span className="truncate text-[13px] font-bold">{d.name}</span></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsSpec.map((r) => (
                  <tr key={r.label} className="border-b border-line/70">
                    <td className="px-5 py-3 text-xs font-bold text-ink-mute">{r.label}</td>
                    {saved.map((d) => <td key={d.id} className="px-4 py-3 text-[13px] font-semibold text-ink-soft">{r.cell(d)}</td>)}
                  </tr>
                ))}
                {COMPARE_METRICS.map((m) => {
                  const b = best(m.key, m.better)
                  return (
                    <tr key={m.key} className="border-b border-line/70 bg-slate-50/50 last:border-0">
                      <td className="px-5 py-3 text-xs font-bold text-ink">{m.label}<span className="ml-1 font-semibold text-ink-mute">({m.unit})</span></td>
                      {saved.map((d, i) => (
                        <td key={d.id} className="px-4 py-3">
                          <span className={`num inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-bold ${i === b ? 'bg-aqua-50 text-aqua-700 ring-1 ring-aqua-300' : ''}`}>
                            {(d.metrics[m.key] as number).toFixed(m.digits)}
                            {i === b && <><Check size={12} strokeWidth={3.4} /><span className="text-[9px] font-extrabold uppercase tracking-wider">Best</span></>}
                          </span>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>

          <div className="mb-3 flex items-center gap-2"><h2 className="text-lg font-extrabold tracking-tight">Charts</h2><span className="text-xs font-semibold text-ink-mute">bars follow the numbered designs above</span></div>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {COMPARE_METRICS.map((m) => <ComparisonBars key={m.key} items={items} metric={m} />)}
            {items.length >= 2 && <div className="md:col-span-2 xl:col-span-1"><ComparisonRadar items={items} /></div>}
          </div>
        </>
      )}

      <StepNav back="/results" backLabel="Results" next="/optimize" nextLabel="Optimize with AI" />
    </>
  )
}
