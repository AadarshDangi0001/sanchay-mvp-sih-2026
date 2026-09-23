import { useLocation, Link } from 'react-router-dom'
import { Bookmark, RotateCcw } from 'lucide-react'
import { MAX_SAVED_DESIGNS, useProjectStore } from '../../store/useProjectStore'
import { toast } from '../common/Toaster'
import { Logo } from './Logo'

const DESIGN_PAGES = ['/design', '/materials', '/simulation', '/results', '/comparison', '/whatif']

export function Topbar() {
  const project = useProjectStore((s) => s.project)
  const save = useProjectStore((s) => s.saveCurrentDesign)
  const reset = useProjectStore((s) => s.resetDesign)
  const savedCount = useProjectStore((s) => s.savedDesigns.length)
  const { pathname } = useLocation()
  const showDesignActions = !!project && DESIGN_PAGES.includes(pathname)

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-white/85 px-5 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" className="md:hidden"><Logo size={30} /></Link>
        {project ? (
          <div className="min-w-0">
            <div className="eyebrow leading-none">Project</div>
            <div className="mt-1 truncate text-sm font-bold leading-none">
              {project.name} <span className="font-medium text-ink-mute">· {project.location}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm font-semibold text-ink-mute">No project open</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="chip hidden !border-amber-200 !bg-amber-50 !text-amber-800 lg:inline-flex">Demo data</span>
        {showDesignActions && (
          <>
            <button
              className="btn-ghost btn-sm"
              onClick={() => {
                reset()
                toast('Design reset to the project defaults.', 'info')
              }}
            >
              <RotateCcw size={15} /> <span className="hidden sm:inline">Reset design</span>
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                const r = save()
                toast(r.message, r.ok ? 'success' : 'error')
              }}
              title={`${savedCount}/${MAX_SAVED_DESIGNS} designs saved`}
            >
              <Bookmark size={15} /> <span className="hidden sm:inline">Save design</span>
              <span className="num rounded-md bg-white/20 px-1.5 text-[11px]">{savedCount}/{MAX_SAVED_DESIGNS}</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
