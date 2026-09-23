import { Link, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { STEPS, stepByPath } from './steps'
import { useCompleted } from './useStepStatus'

/** Horizontal progress rail with a shelter marker riding the current stage. */
export function Stepper() {
  const { pathname } = useLocation()
  const current = stepByPath(pathname)
  const done = useCompleted()
  const idx = current ? STEPS.findIndex((s) => s.id === current.id) : -1
  if (idx < 0) return null
  const pct = (idx / (STEPS.length - 1)) * 100

  return (
    <nav aria-label="Workflow progress" className="no-print card mb-6 overflow-hidden px-5 pb-4 pt-4">
      <div className="relative">
        <div className="absolute left-[14px] right-[14px] top-[13px] h-[3px] rounded-full bg-slate-200" />
        <div
          className="absolute left-[14px] top-[13px] h-[3px] rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `calc((100% - 28px) * ${pct / 100})` }}
        />
        <ol className="relative flex justify-between">
          {STEPS.map((s, i) => {
            const isCurrent = i === idx
            const isDone = done[s.id] && !isCurrent
            return (
              <li key={s.id} className="flex w-0 flex-1 flex-col items-center first:items-start last:items-end">
                <Link
                  to={s.path}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="group flex flex-col items-center gap-2 outline-none"
                >
                  <span
                    className={`num grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-bold transition ${
                      isCurrent
                        ? 'scale-110 border-brand-600 bg-brand-600 text-white ring-4 ring-brand-100'
                        : isDone
                          ? 'border-aqua-500 bg-aqua-500 text-white'
                          : 'border-slate-300 bg-white text-ink-mute group-hover:border-brand-400 group-focus-visible:border-brand-400'
                    }`}
                  >
                    {isDone ? <Check size={13} strokeWidth={3.2} /> : i + 1}
                  </span>
                  <span
                    className={`hidden text-[11px] font-bold leading-none xl:block ${
                      isCurrent ? 'text-brand-700' : 'text-ink-mute group-hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="mt-3 text-center text-xs font-bold text-brand-700 xl:hidden">
        {STEPS[idx].long} <span className="text-ink-mute">· step {idx + 1} of {STEPS.length}</span>
      </div>
    </nav>
  )
}
