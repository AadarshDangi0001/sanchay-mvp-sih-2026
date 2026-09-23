import { Check } from 'lucide-react'
import { SIMULATION_STAGES } from '../../services/api'
import { Spinner } from '../common/Loader'

export interface RunLog {
  stage: number
  progress: number
  lines: string[]
}

export function RunOverlay({ log }: { log: RunLog }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/40 p-4 backdrop-blur-sm animate-fade" role="dialog" aria-modal aria-label="Simulation running">
      <div className="card w-full max-w-xl overflow-hidden shadow-pop">
        <div className="bp-lines border-b border-line px-6 py-5">
          <div className="eyebrow mb-1 flex items-center gap-2"><Spinner size={13} /> Demo thermal engine</div>
          <h2 className="text-xl font-extrabold tracking-tight">Solving the hourly energy balance…</h2>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${Math.max(4, log.progress * 100)}%` }} />
          </div>
        </div>
        <ol className="space-y-2.5 px-6 py-5">
          {SIMULATION_STAGES.map((s, i) => {
            const done = i < log.stage
            const active = i === log.stage
            return (
              <li key={s.label} className={`flex items-center gap-3 text-sm font-semibold transition ${done ? 'text-ink' : active ? 'text-brand-700' : 'text-slate-400'}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full ${done ? 'bg-aqua-500 text-white' : active ? 'border-2 border-brand-500 text-brand-600' : 'border-2 border-slate-200'}`}>
                  {done ? <Check size={13} strokeWidth={3.4} /> : active ? <Spinner size={12} /> : null}
                </span>
                {s.label}
              </li>
            )
          })}
        </ol>
        <div className="num max-h-28 overflow-hidden border-t border-line bg-slate-950 px-6 py-3.5 text-[11px] leading-relaxed text-cyan-200">
          {log.lines.slice(-5).map((l, i) => <div key={i} className="truncate opacity-90"><span className="text-slate-500">›</span> {l}</div>)}
          <span className="inline-block h-3 w-1.5 translate-y-0.5 animate-[blink_1s_steps(2)_infinite] bg-cyan-300" />
        </div>
      </div>
    </div>
  )
}
