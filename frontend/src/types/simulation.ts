import type { ShelterDesign } from './shelter'

export interface SimulationSettings {
  startHour: number
  endHour: number
  /** hours */
  timeStep: number
  comfortMin: number
  comfortMax: number
  /** baseline air changes per hour */
  ventilationACH: number
  occupants: number
}

export type LossKey = 'walls' | 'roof' | 'floor' | 'windows' | 'door' | 'ventilation'
export type SurfaceKey = 'walls' | 'roof' | 'floor' | 'windows' | 'door'

export interface HourlyResult {
  hour: number
  outdoorTemp: number
  indoorTemp: number
  /** W/m² global horizontal */
  solarRadiation: number
  /** W — windows + absorbed on opaque surfaces */
  solarGain: number
  /** W — sum of component losses */
  heatLoss: number
  internalGain: number
  /** W — solar + internal − losses (= storage rate) */
  netGain: number
  /** W required to hold the comfort range (steady-state estimate) */
  energyDemand: number
  heatingDemand: number
  coolingDemand: number
  lossByComponent: Record<LossKey, number>
  /** °C inside-surface temperature */
  surfaceTemp: Record<SurfaceKey, number>
  /** W/m² conductive heat flux out through each surface */
  surfaceFlux: Record<SurfaceKey, number>
  comfortable: boolean
}

export interface SimulationMetrics {
  avgIndoor: number
  minIndoor: number
  maxIndoor: number
  avgOutdoor: number
  /** kWh over the period */
  solarGainKWh: number
  heatLossKWh: number
  netKWh: number
  comfortHours: number
  totalHours: number
  comfortPct: number
  /** kWh needed to hold the comfort range */
  energyKWh: number
  heatingKWh: number
  coolingKWh: number
}

export interface EnvelopeSummary {
  area: Record<SurfaceKey, number>
  uValue: Record<SurfaceKey, number>
  ua: Record<SurfaceKey | 'ventilation', number>
  totalUA: number
  /** Wh/K effective thermal capacity */
  capacity: number
  /** hours */
  timeConstant: number
  windowArea: number
  volume: number
  floorArea: number
}

export interface SimulationResult {
  id: string
  createdAt: string
  key: string
  design: ShelterDesign
  settings: SimulationSettings
  weatherLabel: string
  hourly: HourlyResult[]
  metrics: SimulationMetrics
  /** kWh per loss component over the period */
  lossKWh: Record<LossKey, number>
  envelope: EnvelopeSummary
}

export interface SavedDesign {
  id: string
  name: string
  savedAt: string
  design: ShelterDesign
  metrics: SimulationMetrics
  lossKWh: Record<LossKey, number>
}

export interface OptimizationCandidate {
  id: string
  rank: number
  label: string
  tag: string
  design: ShelterDesign
  metrics: SimulationMetrics
  score: number
  /** build-cost proxy relative to the baseline (100 = same) */
  relCost: number
  envelope: EnvelopeSummary
  reasons: string[]
}

export type OptimizationPriority = 'balanced' | 'energy' | 'comfort'

export interface CloudPoint {
  x: number // heat loss kWh
  y: number // comfort hours
  score: number
  pareto?: boolean
}

export interface OptimizationResult {
  id: string
  createdAt: string
  evaluated: number
  baseline: SimulationMetrics
  baselineDesign: ShelterDesign
  candidates: OptimizationCandidate[]
  cloud: CloudPoint[]
  locked: string[]
  priority: OptimizationPriority
}
