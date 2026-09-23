import { useEffect } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { completionOf } from '../../utils/progress'

export type StepStatus = 'done' | 'current' | 'todo'

/** Mark a workflow step as visited when its page mounts. */
export function useVisit(stepId: string) {
  const mark = useProjectStore((s) => s.markVisited)
  const has = useProjectStore((s) => !!s.project)
  useEffect(() => {
    if (has) mark(stepId)
  }, [stepId, has, mark])
}

export function useCompleted(): Record<string, boolean> {
  const visited = useProjectStore((s) => s.visited)
  const results = useProjectStore((s) => s.simulationResults)
  const saved = useProjectStore((s) => s.savedDesigns.length)
  const opt = useProjectStore((s) => s.optimizationResults)
  const sel = useProjectStore((s) => s.selectedRecommendation)
  return completionOf({ visited, simulationResults: results, savedDesigns: Array.from({ length: saved }), optimizationResults: opt, selectedRecommendation: sel })
}
