import type { Material, MaterialRole } from '../types/material'

/** Mock material database. Values are typical handbook figures, rounded for the demo. */
export const MATERIALS: Material[] = [
  {
    id: 'concrete',
    name: 'Concrete',
    category: 'Structural',
    description: 'Dense, durable, high thermal mass. Poor insulator on its own.',
    conductivity: 1.4, density: 2300, specificHeat: 880, emissivity: 0.9, absorptivity: 0.65,
    thickness: 150, thicknessRange: [50, 400], costIndex: 2,
    color: '#a3acb8', roughness: 0.92, metalness: 0,
    roles: ['wall', 'roof', 'floor', 'mass'],
  },
  {
    id: 'stone',
    name: 'Stone',
    category: 'Structural',
    description: 'Local masonry. Excellent heat storage; slow to warm and slow to cool.',
    conductivity: 1.9, density: 2500, specificHeat: 840, emissivity: 0.93, absorptivity: 0.55,
    thickness: 250, thicknessRange: [100, 500], costIndex: 2,
    color: '#8f8676', roughness: 0.97, metalness: 0,
    roles: ['wall', 'floor', 'mass'],
  },
  {
    id: 'wood',
    name: 'Wood',
    category: 'Structural',
    description: 'Renewable timber framing with moderate insulating value.',
    conductivity: 0.13, density: 600, specificHeat: 1600, emissivity: 0.9, absorptivity: 0.6,
    thickness: 100, thicknessRange: [20, 300], costIndex: 2,
    color: '#c9925a', roughness: 0.8, metalness: 0,
    roles: ['wall', 'roof', 'floor'],
  },
  {
    id: 'polyurethane',
    name: 'Polyurethane',
    category: 'Insulation',
    description: 'Rigid PU foam. Very low conductivity — high R-value per millimetre.',
    conductivity: 0.026, density: 35, specificHeat: 1400, emissivity: 0.9, absorptivity: 0.5,
    thickness: 80, thicknessRange: [20, 300], costIndex: 3,
    color: '#f0d56f', roughness: 0.85, metalness: 0,
    roles: ['wall', 'roof', 'floor'],
  },
  {
    id: 'fiberglass',
    name: 'Fiberglass',
    category: 'Insulation',
    description: 'Glass-fibre batt / panel. Affordable and light, good insulator.',
    conductivity: 0.04, density: 30, specificHeat: 840, emissivity: 0.9, absorptivity: 0.55,
    thickness: 100, thicknessRange: [25, 300], costIndex: 1,
    color: '#cfe0b8', roughness: 0.9, metalness: 0,
    roles: ['wall', 'roof', 'floor'],
  },
  {
    id: 'composite',
    name: 'Composite Insulation',
    category: 'Insulation',
    description: 'Insulated sandwich panel (SIP-style): rigid core between structural skins.',
    conductivity: 0.025, density: 60, specificHeat: 1300, emissivity: 0.88, absorptivity: 0.55,
    thickness: 120, thicknessRange: [40, 300], costIndex: 4,
    color: '#a9cdf0', roughness: 0.6, metalness: 0.05,
    roles: ['wall', 'roof', 'floor'],
  },
  {
    id: 'aluminium',
    name: 'Aluminium',
    category: 'Metal',
    description: 'Light cladding sheet. Conducts heat readily — needs insulation behind it.',
    conductivity: 205, density: 2700, specificHeat: 900, emissivity: 0.09, absorptivity: 0.3,
    thickness: 3, thicknessRange: [1, 20], costIndex: 3,
    color: '#cfd6de', roughness: 0.32, metalness: 0.75,
    roles: ['wall', 'roof'],
  },
  // Glazing (effective conductivity includes the gas gap)
  {
    id: 'single-glass',
    name: 'Single Glazing',
    category: 'Glazing',
    description: 'One pane of clear glass. High light transmission, high heat loss.',
    conductivity: 1.0, density: 2500, specificHeat: 840, emissivity: 0.84, absorptivity: 0.06,
    thickness: 6, thicknessRange: [4, 10], shgc: 0.85, costIndex: 1,
    color: '#bfe6f5', roughness: 0.05, metalness: 0.1,
    roles: ['window'],
  },
  {
    id: 'double-glass',
    name: 'Double Glazing',
    category: 'Glazing',
    description: 'Two panes with a sealed gas gap. The sensible default for cold sites.',
    conductivity: 0.048, density: 2500, specificHeat: 840, emissivity: 0.84, absorptivity: 0.12,
    thickness: 24, thicknessRange: [16, 32], shgc: 0.7, costIndex: 3,
    color: '#b4e0f2', roughness: 0.05, metalness: 0.1,
    roles: ['window'],
  },
  {
    id: 'triple-lowe',
    name: 'Triple Low-E Glazing',
    category: 'Glazing',
    description: 'Three panes with low-emissivity coatings. Best retention, slightly lower solar gain.',
    conductivity: 0.06, density: 2500, specificHeat: 840, emissivity: 0.05, absorptivity: 0.18,
    thickness: 44, thicknessRange: [36, 52], shgc: 0.5, costIndex: 5,
    color: '#a7dcee', roughness: 0.05, metalness: 0.15,
    roles: ['window'],
  },
  {
    id: 'polycarbonate',
    name: 'Twin-wall Polycarbonate',
    category: 'Glazing',
    description: 'Lightweight, impact-resistant multiwall sheet. Diffuse, moderate insulation.',
    conductivity: 0.12, density: 1200, specificHeat: 1200, emissivity: 0.9, absorptivity: 0.1,
    thickness: 16, thicknessRange: [10, 25], shgc: 0.62, costIndex: 2,
    color: '#d5eef7', roughness: 0.25, metalness: 0,
    roles: ['window'],
  },
  // Thermal-mass-only options
  {
    id: 'water',
    name: 'Water Storage Panels',
    category: 'Thermal mass',
    description: 'Sealed water tanks along the floor. Highest heat capacity per volume.',
    conductivity: 0.6, density: 1000, specificHeat: 4186, emissivity: 0.95, absorptivity: 0.85,
    thickness: 100, thicknessRange: [50, 300], costIndex: 2,
    color: '#5aa7d8', roughness: 0.2, metalness: 0,
    roles: ['mass'],
  },
  {
    id: 'rammed-earth',
    name: 'Rammed Earth',
    category: 'Thermal mass',
    description: 'Compacted local soil. Low-carbon mass with a matte, warm finish.',
    conductivity: 1.0, density: 1900, specificHeat: 900, emissivity: 0.93, absorptivity: 0.7,
    thickness: 150, thicknessRange: [50, 400], costIndex: 1,
    color: '#b08968', roughness: 1, metalness: 0,
    roles: ['wall', 'floor', 'mass'],
  },
]

export const MATERIAL_MAP: Record<string, Material> = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

export function getMaterial(id: string): Material {
  return MATERIAL_MAP[id] ?? MATERIALS[0]
}

export function materialsForRole(role: MaterialRole): Material[] {
  return MATERIALS.filter((m) => m.roles.includes(role))
}

/** Door is modelled as a 50 mm solid timber leaf. */
export const DOOR_MATERIAL = getMaterial('wood')
export const DOOR_THICKNESS_MM = 50
