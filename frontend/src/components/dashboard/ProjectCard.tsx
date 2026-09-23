import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, MapPin, Trash2 } from 'lucide-react'
import type { Workspace } from '../../data/seed'
import { STEPS } from '../layout/steps'
import { timeAgo } from '../../utils/format'
import { completedCount, nextStepFor } from '../../utils/progress'
import { ShapeGlyph } from '../shelter/ShapePicker'
import { useProjectStore } from '../../store/useProjectStore'

export function ProjectCard({ ws, active }: { ws: Workspace; active: boolean }) {
  const open = useProjectStore((s) => s.openProject)
  const del = useProjectStore((s) => s.deleteProject)
  const nav = useNavigate()
  const done = completedCount(ws)
  const next = nextStepFor(ws)
  const comfort = ws.simulationResults?.metrics.comfortPct

  return (
    <article className={`card group relative flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-300 ${active ? 'ring-2 ring-brand-200' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-[72px] shrink-0 place-items-center rounded-xl border border-brand-100 bg-brand-50/60 text-brand-600">
          <ShapeGlyph type={ws.design.type} className="h-9 w-14" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold tracking-tight">{ws.project.name}</h3>
          <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-ink-mute">
            <MapPin size={12} /> {ws.project.location}
          </p>
          <span className="chip mt-2 !py-0.5 !text-[11px]">{ws.project.climate}</span>
        </div>
        {active && <span className="rounded-full bg-aqua-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-aqua-700">Active</span>}
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.6em] text-[13px] leading-snug text-ink-soft">{ws.project.description || 'No description.'}</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-ink-mute">
          <span>Workflow</span>
          <span className="num">{done}/{STEPS.length}</span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <span key={s.id} className={`h-1.5 flex-1 rounded-full ${i < done ? 'bg-brand-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        {[
          ['Comfort', comfort === undefined ? '—' : `${comfort.toFixed(0)}%`],
          ['Sims', String(ws.simCount)],
          ['Saved', String(ws.savedDesigns.length)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{k}</dt>
            <dd className="num text-base font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-ink-mute">Updated {timeAgo(ws.project.updatedAt)}</span>
        <div className="flex gap-1.5">
          <button
            aria-label={`Delete ${ws.project.name}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            onClick={() => {
              if (confirm(`Delete “${ws.project.name}”? This cannot be undone.`)) del(ws.project.id)
            }}
          >
            <Trash2 size={15} />
          </button>
          <button
            className="btn-outline btn-sm"
            onClick={() => {
              open(ws.project.id)
              nav(next.path)
            }}
          >
            {done === 0 ? 'Open' : `Continue · ${next.label}`} <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
