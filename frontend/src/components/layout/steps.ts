import { Box, CloudSun, FileText, FolderPlus, GitCompare, Layers, Play, Sparkles, Thermometer, Trophy, type LucideIcon } from 'lucide-react'

export interface Step {
  id: string
  path: string
  label: string
  long: string
  icon: LucideIcon
}

export const STEPS: Step[] = [
  { id: 'create', path: '/create', label: 'Project', long: 'Create project', icon: FolderPlus },
  { id: 'climate', path: '/climate', label: 'Climate', long: 'Location & climate', icon: CloudSun },
  { id: 'design', path: '/design', label: 'Design', long: 'Shelter design & live 3D', icon: Box },
  { id: 'materials', path: '/materials', label: 'Materials', long: 'Material selection', icon: Layers },
  { id: 'simulate', path: '/simulation', label: 'Simulate', long: 'Simulation settings', icon: Play },
  { id: 'results', path: '/results', label: 'Results', long: 'Thermal results', icon: Thermometer },
  { id: 'compare', path: '/comparison', label: 'Compare', long: 'Design comparison', icon: GitCompare },
  { id: 'optimize', path: '/optimize', label: 'Optimize', long: 'AI optimization', icon: Sparkles },
  { id: 'recommend', path: '/recommendation', label: 'Recommended', long: 'Recommended design', icon: Trophy },
  { id: 'report', path: '/report', label: 'Report', long: 'Export report', icon: FileText },
]

export const stepIndex = (id: string) => STEPS.findIndex((s) => s.id === id)
export const stepByPath = (path: string) => STEPS.find((s) => path.startsWith(s.path))
