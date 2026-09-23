export type MaterialRole = 'wall' | 'roof' | 'floor' | 'window' | 'mass'
export type MaterialCategory = 'Structural' | 'Insulation' | 'Metal' | 'Glazing' | 'Thermal mass'

export interface Material {
  id: string
  name: string
  category: MaterialCategory
  description: string
  /** W/m·K */
  conductivity: number
  /** kg/m³ */
  density: number
  /** J/kg·K */
  specificHeat: number
  /** 0–1 long-wave emissivity */
  emissivity: number
  /** 0–1 solar absorptivity */
  absorptivity: number
  /** default thickness in mm */
  thickness: number
  /** allowed thickness range in mm */
  thicknessRange: [number, number]
  /** solar heat gain coefficient (glazing only) */
  shgc?: number
  /** relative cost index 1 (cheap) – 5 (expensive) — mock */
  costIndex: number
  color: string
  roughness: number
  metalness: number
  roles: MaterialRole[]
}
