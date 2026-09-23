import { NavLink } from 'react-router-dom'
import { Check, LayoutDashboard, Scale } from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import { Logo } from './Logo'
import { STEPS } from './steps'
import { useCompleted } from './useStepStatus'

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-slate-50 hover:text-ink'
  }`

export function Sidebar() {
  const project = useProjectStore((s) => s.project)
  const done = useCompleted()
  return (
    <aside className="no-print sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col border-r border-line bg-white md:flex xl:w-[248px]">
      <div className="flex items-center gap-3 px-4 py-5 xl:px-5">
        <Logo />
        <div className="hidden xl:block">
          <div className="text-[17px] font-extrabold leading-none tracking-tight">ClimaForge</div>
          <div className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-ink-mute">Passive shelter lab</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <NavLink to="/" end className={linkCls} title="Dashboard">
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r bg-brand-600" />}
              <LayoutDashboard size={18} className="shrink-0" />
              <span className="hidden xl:inline">Dashboard</span>
            </>
          )}
        </NavLink>

        <div className="eyebrow mb-1.5 mt-5 hidden px-3 xl:block">Workflow</div>
        <div className="mt-4 space-y-0.5 xl:mt-0">
          {STEPS.map((s, i) => (
            <NavLink key={s.id} to={s.path} className={linkCls} title={s.long}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r bg-brand-600" />}
                  <span
                    className={`num grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                      isActive ? 'bg-brand-600 text-white' : done[s.id] ? 'bg-aqua-100 text-aqua-700' : 'bg-slate-100 text-ink-mute'
                    }`}
                  >
                    {done[s.id] && !isActive ? <Check size={12} strokeWidth={3} /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="hidden xl:inline">{s.long}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="eyebrow mb-1.5 mt-5 hidden px-3 xl:block">Tools</div>
        <div className="mt-4 xl:mt-0">
          <NavLink to="/whatif" className={linkCls} title="What if?">
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r bg-brand-600" />}
                <Scale size={18} className="shrink-0" />
                <span className="hidden xl:inline">What if? analysis</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

      <div className="hidden border-t border-line p-4 xl:block">
        <div className="rounded-xl border border-line bg-slate-50 p-3">
          <div className="eyebrow mb-1">Active project</div>
          <div className="truncate text-[13px] font-bold">{project?.name ?? 'None selected'}</div>
          <div className="mt-0.5 truncate text-xs font-medium text-ink-mute">{project?.location ?? '—'}</div>
        </div>
        <p className="mt-3 px-1 text-[10.5px] font-medium leading-snug text-ink-mute">
          Frontend MVP · all data and physics are mocked for demonstration.
        </p>
      </div>
    </aside>
  )
}
