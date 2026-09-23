import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bookmark, Box, FileText, FolderPlus, Gauge, Play, Plus, RotateCcw, Scale, Sparkles, Thermometer,
} from 'lucide-react'
import { ProjectCard } from '../components/dashboard/ProjectCard'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { Ring } from '../components/common/Ring'
import { Stat } from '../components/common/Stat'
import { ShelterViewer } from '../components/shelter3d/ShelterViewer'
import { useProjectStore } from '../store/useProjectStore'
import { bearingLabel, designLabel } from '../utils/geometry'
import { completedCount, nextStepFor } from '../utils/progress'
import { toast } from '../components/common/Toaster'
import { STEPS } from '../components/layout/steps'

export default function Dashboard() {
  const nav = useNavigate()
  const projects = useProjectStore((s) => s.projects)
  const workspaces = useProjectStore((s) => s.workspaces)
  const activeId = useProjectStore((s) => s.activeId)
  const project = useProjectStore((s) => s.project)
  const design = useProjectStore((s) => s.design)
  const weather = useProjectStore((s) => s.weather)
  const results = useProjectStore((s) => s.simulationResults)
  const ws = activeId ? workspaces[activeId] : undefined
  const reset = useProjectStore((s) => s.resetDemoData)

  const all = projects.map((p) => workspaces[p.id]).filter(Boolean)
  const totalSims = all.reduce((s, w) => s + w.simCount, 0)
  const totalSaved = all.reduce((s, w) => s + w.savedDesigns.length, 0)
  const scored = all.filter((w) => w.simulationResults)
  const avgComfort = scored.length ? scored.reduce((s, w) => s + w.simulationResults!.metrics.comfortPct, 0) / scored.length : 0
  const sorted = [...all].sort((a, b) => +new Date(b.project.updatedAt) - +new Date(a.project.updatedAt))
  const next = ws ? nextStepFor(ws) : STEPS[0]

  const actions = [
    { to: '/create', label: 'New project', hint: 'Start from a climate', icon: FolderPlus },
    { to: '/design', label: 'Edit design', hint: 'Live 3D editor', icon: Box },
    { to: '/simulation', label: 'Run simulation', hint: 'Hourly thermal demo', icon: Play },
    { to: '/optimize', label: 'Optimize', hint: '1000+ configurations', icon: Sparkles },
    { to: '/whatif', label: 'What if?', hint: 'Current vs modified', icon: Scale },
    { to: '/report', label: 'Export report', hint: 'Printable summary', icon: FileText },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={<>Welcome back. <span className="text-brand-600">Design for the climate,</span> not against it.</>}
        subtitle="Model a passive shelter, watch the sun move across it, and compare how designs behave through a winter day."
        actions={
          <button className="btn-primary" onClick={() => nav('/create')}>
            <Plus size={17} /> Create New Project
          </button>
        }
      />

      {project && ws ? (
        <Card className="bp-lines mb-6 grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col justify-between gap-6 p-6 lg:p-8">
            <div>
              <div className="eyebrow mb-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-aqua-500" /></span>
                Active project
              </div>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight lg:text-[28px]">{project.name}</h2>
              <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-ink-soft">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip">{project.location}</span>
                <span className="chip">{project.climate}</span>
                <span className="chip num">{designLabel(design)}</span>
                <span className="chip num">{design.orientation}° {bearingLabel(design.orientation)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ['Avg indoor', results ? `${results.metrics.avgIndoor.toFixed(1)}°C` : '—'],
                ['Comfort hrs', results ? `${results.metrics.comfortHours.toFixed(0)} h` : '—'],
                ['Energy need', results ? `${results.metrics.energyKWh.toFixed(1)} kWh` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-white/85 px-3.5 py-3 backdrop-blur">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{k}</div>
                  <div className="num mt-1 text-xl font-bold">{v}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to={next.path} className="btn-primary">
                Continue · {next.long} <ArrowRight size={16} />
              </Link>
              <Link to="/design" className="btn-outline">Open 3D design</Link>
              <span className="num text-xs font-semibold text-ink-mute">{completedCount(ws)}/{STEPS.length} steps complete</span>
            </div>
          </div>
          <div className="relative min-h-[340px] border-t border-line lg:border-l lg:border-t-0">
            <ShelterViewer
              design={design} hour={13} latitude={weather.latitude} dayOfYear={weather.dayOfYear} autoRotate showCompass
              showSunPath className="!absolute inset-0 !rounded-none !border-0 !bg-transparent" caption="Live parametric model · drag to orbit"
            />
          </div>
        </Card>
      ) : (
        <div className="mb-6">
          <EmptyState
            icon={<FolderPlus size={26} />} title="No project open"
            body="Create a project to define a location and climate, then design and simulate a passive shelter."
            action={<Link to="/create" className="btn-primary"><Plus size={16} /> Create New Project</Link>}
          />
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total simulations" value={totalSims} icon={<Thermometer size={16} />} hint={`across ${all.length} projects`} />
        <Stat label="Saved designs" value={totalSaved} icon={<Bookmark size={16} />} tone="aqua" hint="ready to compare" />
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-mute"><Gauge size={14} /> Avg comfort score</div>
            <div className="text-xs font-semibold leading-snug text-ink-mute">Share of hours inside the comfort range, across simulated projects.</div>
          </div>
          <Ring value={avgComfort} label="comfort" color="var(--color-aqua-500)" />
        </div>
        <Stat label="Projects" value={all.length} icon={<FolderPlus size={16} />} tone="amber" hint="stored in this browser" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight">Recent projects</h2>
            <Link to="/create" className="btn-ghost btn-sm"><Plus size={15} /> New</Link>
          </div>
          {sorted.length === 0 ? (
            <EmptyState icon={<FolderPlus size={26} />} title="Nothing here yet" body="Your projects are saved in this browser. Start with a climate archetype and iterate." action={<Link to="/create" className="btn-primary">Create project</Link>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {sorted.map((w) => <ProjectCard key={w.project.id} ws={w} active={w.project.id === activeId} />)}
            </div>
          )}
        </section>

        <aside>
          <h2 className="mb-4 text-lg font-extrabold tracking-tight">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            {actions.map((a) => (
              <Link key={a.to} to={a.to} className="card group flex items-center gap-3.5 p-3.5 transition hover:border-brand-300 hover:bg-brand-50/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><a.icon size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{a.label}</span>
                  <span className="block truncate text-xs font-medium text-ink-mute">{a.hint}</span>
                </span>
                <ArrowRight size={15} className="ml-auto hidden text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 xl:block" />
              </Link>
            ))}
          </div>
          <button
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink-mute transition hover:text-red-600"
            onClick={() => {
              if (confirm('Reset all projects to the bundled demo data?')) {
                reset()
                toast('Demo data restored.', 'info')
              }
            }}
          >
            <RotateCcw size={13} /> Reset demo data
          </button>
        </aside>
      </div>
    </>
  )
}
