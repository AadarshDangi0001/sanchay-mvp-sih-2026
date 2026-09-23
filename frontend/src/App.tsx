import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import { Skeleton } from './components/common/Loader'

const CreateProject = lazy(() => import('./pages/CreateProject'))
const Climate = lazy(() => import('./pages/Climate'))
const ShelterDesigner = lazy(() => import('./pages/ShelterDesigner'))
const Materials = lazy(() => import('./pages/Materials'))
const Simulation = lazy(() => import('./pages/Simulation'))
const Results = lazy(() => import('./pages/Results'))
const Comparison = lazy(() => import('./pages/Comparison'))
const Optimization = lazy(() => import('./pages/Optimization'))
const Recommendation = lazy(() => import('./pages/Recommendation'))
const WhatIf = lazy(() => import('./pages/WhatIf'))
const Report = lazy(() => import('./pages/Report'))

const Fallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-1/3" />
    <Skeleton className="h-64 w-full" />
  </div>
)

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="create" element={<CreateProject />} />
            <Route path="climate" element={<Climate />} />
            <Route path="design" element={<ShelterDesigner />} />
            <Route path="materials" element={<Materials />} />
            <Route path="simulation" element={<Simulation />} />
            <Route path="results" element={<Results />} />
            <Route path="comparison" element={<Comparison />} />
            <Route path="optimize" element={<Optimization />} />
            <Route path="recommendation" element={<Recommendation />} />
            <Route path="whatif" element={<WhatIf />} />
            <Route path="report" element={<Report />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
