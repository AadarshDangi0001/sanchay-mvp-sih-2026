import type { Workspace } from '../data/seed'
import { STEPS } from '../components/layout/steps'

type ProgressInput = Pick<Workspace, 'visited' | 'simulationResults' | 'savedDesigns' | 'optimizationResults' | 'selectedRecommendation'>

export function completionOf(ws: ProgressInput): Record<string, boolean> {
  return {
    create: !!ws.visited.create,
    climate: !!ws.visited.climate,
    design: !!ws.visited.design,
    materials: !!ws.visited.materials,
    simulate: !!ws.simulationResults,
    results: !!ws.simulationResults && !!ws.visited.results,
    compare: ws.savedDesigns.length > 0 && !!ws.visited.compare,
    optimize: !!ws.optimizationResults,
    recommend: !!ws.selectedRecommendation,
    report: !!ws.visited.report,
  }
}

export const completedCount = (ws: ProgressInput) => Object.values(completionOf(ws)).filter(Boolean).length

export function nextStepFor(ws: ProgressInput) {
  const done = completionOf(ws)
  return STEPS.find((s) => !done[s.id]) ?? STEPS[STEPS.length - 1]
}
