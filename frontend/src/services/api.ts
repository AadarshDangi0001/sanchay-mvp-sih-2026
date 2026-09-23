/**
 * Mock service layer.
 *
 * The UI only talks to these functions. Each one currently runs a deterministic in-browser mock; to connect a
 * real backend later (weather API, Python / ANSYS solver, ML optimiser) replace the body of the function
 * — the signatures and return types are the contract, so no page or component needs to change.
 */
import { ARCHETYPES, matchPreset, weatherFromPreset } from '../data/weather'
import { runMockSimulation, type SimulationInput } from '../data/mockSimulation'
import type { ClimateType, WeatherData } from '../types/project'
import type { OptimizationResult, SimulationResult } from '../types/simulation'
import { optimizeDesign, type OptimizeParams, type OptimizeProgress } from '../utils/optimization'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** GET /weather?location=… — mocked with the bundled sample datasets. */
export async function fetchWeather(location: string, climate: ClimateType): Promise<WeatherData> {
  await sleep(350)
  const preset = matchPreset(location, climate)
  return weatherFromPreset(preset, location.trim() || preset.name)
}

export const SIMULATION_STAGES = [
  { label: 'Building parametric mesh from design object', ms: 420 },
  { label: 'Assigning material layers & thermal properties', ms: 420 },
  { label: 'Solving hourly energy balance', ms: 700 },
  { label: 'Post-processing results', ms: 360 },
]

/** POST /simulate — mocked with the in-browser demo engine. `onStage` reports progress for the loader. */
export async function runSimulation(
  input: SimulationInput,
  onStage?: (index: number, progress: number) => void,
): Promise<SimulationResult> {
  const total = SIMULATION_STAGES.reduce((s, x) => s + x.ms, 0)
  let elapsed = 0
  for (let i = 0; i < SIMULATION_STAGES.length; i++) {
    onStage?.(i, elapsed / total)
    await sleep(SIMULATION_STAGES[i].ms)
    elapsed += SIMULATION_STAGES[i].ms
  }
  const result = runMockSimulation(input)
  onStage?.(SIMULATION_STAGES.length, 1)
  return result
}

/** POST /optimize — mocked seeded search. `onProgress` streams candidates so the UI can animate. */
export async function runOptimization(
  params: OptimizeParams,
  onProgress?: (p: OptimizeProgress) => void,
): Promise<OptimizationResult> {
  return optimizeDesign(params, onProgress, true)
}

export { ARCHETYPES }
