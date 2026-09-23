import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '../common/Toaster'
import { Sidebar } from './Sidebar'
import { Stepper } from './Stepper'
import { Topbar } from './Topbar'

export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen bp-dots">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-5 py-7 md:px-8">
          <Stepper />
          <div key={pathname} className="animate-page">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
