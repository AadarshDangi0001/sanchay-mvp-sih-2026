import type { Project } from '../types/project'
import type { SavedDesign } from '../types/simulation'
import type { ShelterDesign } from '../types/shelter'
import { DEFAULT_SETTINGS, runMockSimulation } from './mockSimulation'
import { getPreset, weatherFromPreset } from './weather'
import { DEFAULT_DESIGN, applyTypePreset, withWindowArea } from '../utils/geometry'
import type { ClimateType, WeatherData } from '../types/project'
import type { OptimizationResult, SimulationResult, SimulationSettings } from '../types/simulation'

export interface Workspace {
  project: Project
  weather: WeatherData
  design: ShelterDesign
  settings: SimulationSettings
  simulationResults: SimulationResult | null
  savedDesigns: SavedDesign[]
  optimizationResults: OptimizationResult | null
  selectedRecommendation: string | null
  whatIfDesign: ShelterDesign | null
  visited: Record<string, boolean>
  simCount: number
}

/** A sensible starting design per climate archetype. */
export function defaultDesignFor(climate: ClimateType): ShelterDesign {
  switch (climate) {
    case 'Hot Arid Desert':
      return {
        ...applyTypePreset(DEFAULT_DESIGN, 'rectangular'),
        ...withWindowArea({ ...applyTypePreset(DEFAULT_DESIGN, 'rectangular'), windowCount: 2 }, 1.2),
        wallMaterial: 'stone', wallThickness: 300, roofMaterial: 'composite', roofThickness: 150,
        floorMaterial: 'concrete', floorThickness: 150, thermalMassMaterial: 'stone', massThickness: 200,
      }
    case 'Temperate Mountain':
      return {
        ...applyTypePreset(DEFAULT_DESIGN, 'rectangular'), roofAngle: 30, wallMaterial: 'wood', wallThickness: 150,
        roofMaterial: 'fiberglass', roofThickness: 150, windowCount: 3, windowWidth: 1.1, windowHeight: 1.0,
      }
    case 'Cold Continental':
      return {
        ...applyTypePreset(DEFAULT_DESIGN, 'dome'), wallThickness: 200, roofThickness: 200,
        wallMaterial: 'composite', roofMaterial: 'composite', windowMaterial: 'triple-lowe', windowCount: 2,
      }
    case 'Warm Humid':
      return {
        ...applyTypePreset(DEFAULT_DESIGN, 'rectangular'), roofAngle: 22, wallMaterial: 'wood', wallThickness: 60,
        roofMaterial: 'wood', roofThickness: 60, floorMaterial: 'wood', windowMaterial: 'polycarbonate',
        windowCount: 4, windowWidth: 1.2, windowHeight: 1.1, massThickness: 0,
      }
    default:
      return { ...DEFAULT_DESIGN }
  }
}

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()

function saved(name: string, design: ShelterDesign, weather: WeatherData, daysAgo: number): SavedDesign {
  const r = runMockSimulation({ design, weather, settings: DEFAULT_SETTINGS })
  return { id: `sd-${name.toLowerCase().replace(/\W+/g, '-')}`, name, savedAt: iso(daysAgo), design, metrics: r.metrics, lossKWh: r.lossKWh }
}

export function buildSeed() {
  const leh = weatherFromPreset(getPreset('leh'))
  const changLa = { ...weatherFromPreset(getPreset('leh'), 'Chang La Pass, Ladakh'), elevation: 5360 }
  const shimla = weatherFromPreset(getPreset('shimla'))

  const p1: Project = {
    id: 'seed-ladakh', name: 'Ladakh Winter Shelter',
    description: 'Passive-solar family shelter for a Leh winter — must hold 18 °C without a stove.',
    location: 'Leh, Ladakh', climate: 'High Altitude Cold', createdAt: iso(9), updatedAt: iso(0.2),
  }
  const p2: Project = {
    id: 'seed-cabin', name: 'High Altitude Research Cabin',
    description: 'Four-person field cabin for glaciology researchers above 5,000 m.',
    location: 'Chang La Pass, Ladakh', climate: 'High Altitude Cold', createdAt: iso(21), updatedAt: iso(3),
  }
  const p3: Project = {
    id: 'seed-emergency', name: 'Emergency Mountain Shelter',
    description: 'Rapid-deploy dome for stranded trekkers and rescue teams.',
    location: 'Shimla, Himachal Pradesh', climate: 'Temperate Mountain', createdAt: iso(2), updatedAt: iso(1),
  }

  const d1 = DEFAULT_DESIGN
  const d1b: ShelterDesign = {
    ...withWindowArea({ ...applyTypePreset(DEFAULT_DESIGN, 'rectangular'), windowCount: 3 }, 3),
    wallThickness: 80, roofThickness: 80, wallMaterial: 'fiberglass', roofMaterial: 'fiberglass',
    floorMaterial: 'wood', windowMaterial: 'double-glass',
  }
  const d1c: ShelterDesign = {
    ...DEFAULT_DESIGN, type: 'aframe', length: 5.4, width: 4.1, height: 2.5, roofAngle: 58, orientation: 203,
    windowCount: 2, windowWidth: 1.53, windowHeight: 1.38, wallThickness: 280, roofThickness: 270, floorThickness: 170,
    massThickness: 220, wallMaterial: 'fiberglass', roofMaterial: 'polyurethane', floorMaterial: 'wood',
    windowMaterial: 'double-glass', thermalMassMaterial: 'concrete',
  }
  const d2: ShelterDesign = {
    ...DEFAULT_DESIGN, type: 'aframe', length: 4.4, width: 4.5, height: 3.1, roofAngle: 50, orientation: 155,
    windowCount: 2, windowWidth: 1.54, windowHeight: 1.39, wallThickness: 170, roofThickness: 180, floorThickness: 160,
    massThickness: 220, wallMaterial: 'composite', roofMaterial: 'composite', floorMaterial: 'composite',
    windowMaterial: 'double-glass', thermalMassMaterial: 'concrete',
  }
  const d3: ShelterDesign = {
    ...applyTypePreset(DEFAULT_DESIGN, 'dome'), length: 4.5, width: 4.5, height: 2.6, wallMaterial: 'fiberglass',
    roofMaterial: 'fiberglass', wallThickness: 100, roofThickness: 100, windowCount: 2, windowWidth: 0.8, windowHeight: 0.8,
    windowMaterial: 'polycarbonate', massThickness: 0,
  }

  const visited = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, true]))
  const base = { settings: DEFAULT_SETTINGS, optimizationResults: null, selectedRecommendation: null, whatIfDesign: null }

  const ws1: Workspace = {
    ...base, project: p1, weather: leh, design: d1,
    simulationResults: runMockSimulation({ design: d1, weather: leh, settings: DEFAULT_SETTINGS }),
    savedDesigns: [
      saved('A-Frame · 120 mm composite', d1, leh, 6),
      saved('Rectangular · flat roof · 80 mm', d1b, leh, 5),
      saved('A-Frame · south-tuned + mass', d1c, leh, 4),
    ],
    visited: visited(['create', 'climate', 'design', 'materials', 'simulate', 'results', 'compare']), simCount: 4,
  }
  const ws2: Workspace = {
    ...base, project: p2, weather: changLa, design: d2,
    simulationResults: runMockSimulation({ design: d2, weather: changLa, settings: DEFAULT_SETTINGS }),
    savedDesigns: [], visited: visited(['create', 'climate', 'design', 'materials', 'simulate', 'results']), simCount: 1,
  }
  const ws3: Workspace = {
    ...base, project: p3, weather: shimla, design: d3, simulationResults: null, savedDesigns: [],
    visited: visited(['create', 'climate', 'design']), simCount: 0,
  }
  return {
    projects: [p1, p2, p3],
    workspaces: { [p1.id]: ws1, [p2.id]: ws2, [p3.id]: ws3 } as Record<string, Workspace>,
    activeId: p1.id,
    ws: ws1,
  }
}
