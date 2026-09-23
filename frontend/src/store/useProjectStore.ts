import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultDesignFor, buildSeed, type Workspace } from '../data/seed'
import { DEFAULT_SETTINGS, runMockSimulation, simulationKey } from '../data/mockSimulation'
import { matchPreset, weatherFromPreset } from '../data/weather'
import type { ClimateType, Project, WeatherData } from '../types/project'
import type { ShelterDesign } from '../types/shelter'
import type { OptimizationResult, SavedDesign, SimulationResult, SimulationSettings } from '../types/simulation'
import { designLabel, sanitizeDesign } from '../utils/geometry'
import { uid } from '../utils/format'

export const MAX_SAVED_DESIGNS = 4

/** localStorage with a debounced write so dragging a slider doesn't hammer storage. */
let writeTimer: ReturnType<typeof setTimeout> | undefined
let pending: [string, string] | null = null
const flush = () => {
  if (pending) {
    try { localStorage.setItem(pending[0], pending[1]) } catch { /* quota / private mode */ }
    pending = null
  }
}
if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush)
const debouncedStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => {
    pending = [k, v]
    clearTimeout(writeTimer)
    writeTimer = setTimeout(flush, 250)
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

export interface NewProjectInput {
  name: string
  description: string
  location: string
  climate: ClimateType
}

interface ProjectState extends Workspace {
  projects: Project[]
  activeId: string | null
  workspaces: Record<string, Workspace>

  createProject: (input: NewProjectInput) => string
  openProject: (id: string) => void
  deleteProject: (id: string) => void
  setWeather: (w: WeatherData) => void
  updateDesign: (patch: Partial<ShelterDesign>) => void
  setDesign: (d: ShelterDesign) => void
  resetDesign: () => void
  setSettings: (patch: Partial<SimulationSettings>) => void
  setSimulationResults: (r: SimulationResult) => void
  saveCurrentDesign: (name?: string) => { ok: boolean; message: string }
  removeSavedDesign: (id: string) => void
  renameSavedDesign: (id: string, name: string) => void
  loadSavedDesign: (id: string) => void
  setOptimizationResults: (r: OptimizationResult | null) => void
  selectRecommendation: (id: string | null) => void
  setWhatIfDesign: (d: ShelterDesign | null) => void
  markVisited: (step: string) => void
  resetDemoData: () => void
}

const WS_KEYS = [
  'project', 'weather', 'design', 'settings', 'simulationResults', 'savedDesigns',
  'optimizationResults', 'selectedRecommendation', 'whatIfDesign', 'visited', 'simCount',
] as const

const snapshot = (s: ProjectState): Workspace =>
  Object.fromEntries(WS_KEYS.map((k) => [k, s[k]])) as unknown as Workspace

const seed = buildSeed()

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => {
      /** Apply a patch to the working copy and mirror it into the active project's saved workspace. */
      const commit = (patch: Partial<Workspace>) =>
        set((s) => {
          const next = { ...s, ...patch } as ProjectState
          if (!next.activeId || !next.project) return patch
          const project = { ...next.project, updatedAt: new Date().toISOString() }
          const ws = { ...snapshot(next), project }
          return {
            ...patch,
            project,
            projects: s.projects.map((p) => (p.id === next.activeId ? project : p)),
            workspaces: { ...s.workspaces, [next.activeId]: ws },
          }
        })

      return {
        ...seed.ws,
        projects: seed.projects,
        activeId: seed.activeId,
        workspaces: seed.workspaces,

        createProject: (input) => {
          const preset = matchPreset(input.location, input.climate)
          const id = uid('proj')
          const now = new Date().toISOString()
          const project: Project = {
            id, name: input.name.trim(), description: input.description.trim(),
            location: input.location.trim(), climate: input.climate, createdAt: now, updatedAt: now,
          }
          const ws: Workspace = {
            project,
            weather: weatherFromPreset(preset, input.location.trim()),
            design: defaultDesignFor(input.climate),
            settings: DEFAULT_SETTINGS,
            simulationResults: null,
            savedDesigns: [],
            optimizationResults: null,
            selectedRecommendation: null,
            whatIfDesign: null,
            visited: { create: true },
            simCount: 0,
          }
          set((s) => ({ ...ws, projects: [project, ...s.projects], activeId: id, workspaces: { ...s.workspaces, [id]: ws } }))
          return id
        },

        openProject: (id) => {
          const ws = get().workspaces[id]
          if (ws) set({ ...ws, activeId: id })
        },

        deleteProject: (id) =>
          set((s) => {
            const projects = s.projects.filter((p) => p.id !== id)
            const { [id]: _removed, ...workspaces } = s.workspaces
            void _removed
            if (s.activeId !== id) return { projects, workspaces }
            const next = projects[0]
            return next ? { projects, workspaces, activeId: next.id, ...workspaces[next.id] } : { projects, workspaces, activeId: null }
          }),

        setWeather: (weather) => commit({ weather }),
        updateDesign: (patch) => commit({ design: { ...get().design, ...patch } }),
        setDesign: (design) => commit({ design }),
        resetDesign: () => commit({ design: defaultDesignFor(get().project?.climate ?? 'High Altitude Cold') }),
        setSettings: (patch) => commit({ settings: { ...get().settings, ...patch } }),

        setSimulationResults: (r) => commit({ simulationResults: r, simCount: get().simCount + 1 }),

        saveCurrentDesign: (name) => {
          const s = get()
          if (s.savedDesigns.length >= MAX_SAVED_DESIGNS)
            return { ok: false, message: `You can compare up to ${MAX_SAVED_DESIGNS} designs — remove one first.` }
          const design = sanitizeDesign(s.design)
          const cached = s.simulationResults
          const fresh = cached && cached.key === simulationKey(design, s.weather, s.settings) ? cached : runMockSimulation({ design, weather: s.weather, settings: s.settings })
          const entry: SavedDesign = {
            id: uid('sd'), name: name?.trim() || `${designLabel(design)} · ${design.orientation.toFixed(0)}°`,
            savedAt: new Date().toISOString(), design, metrics: fresh.metrics, lossKWh: fresh.lossKWh,
          }
          commit({ savedDesigns: [...s.savedDesigns, entry] })
          return { ok: true, message: `Saved “${entry.name}” for comparison.` }
        },
        removeSavedDesign: (id) => commit({ savedDesigns: get().savedDesigns.filter((d) => d.id !== id) }),
        renameSavedDesign: (id, name) =>
          commit({ savedDesigns: get().savedDesigns.map((d) => (d.id === id ? { ...d, name: name.trim() || d.name } : d)) }),
        loadSavedDesign: (id) => {
          const d = get().savedDesigns.find((x) => x.id === id)
          if (d) commit({ design: d.design })
        },

        setOptimizationResults: (optimizationResults) => commit({ optimizationResults, selectedRecommendation: null }),
        selectRecommendation: (selectedRecommendation) => commit({ selectedRecommendation }),
        setWhatIfDesign: (whatIfDesign) => commit({ whatIfDesign }),
        markVisited: (step) => {
          if (!get().visited[step] && get().project) commit({ visited: { ...get().visited, [step]: true } })
        },

        resetDemoData: () => {
          const fresh = buildSeed()
          set({ ...fresh.ws, projects: fresh.projects, activeId: fresh.activeId, workspaces: fresh.workspaces })
        },
      }
    },
    { name: 'climaforge-store-v1', version: 1, storage: createJSONStorage(() => debouncedStorage) },
  ),
)

/** True when the stored simulation no longer matches the current design / weather / settings. */
export function isSimulationStale(s: Pick<ProjectState, 'simulationResults' | 'design' | 'weather' | 'settings'>): boolean {
  return !!s.simulationResults && s.simulationResults.key !== simulationKey(s.design, s.weather, s.settings)
}
