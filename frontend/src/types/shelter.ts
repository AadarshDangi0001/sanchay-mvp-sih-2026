export type ShelterType = 'rectangular' | 'aframe' | 'dome'

/**
 * The single source of truth for a shelter. The same object drives the 3D model,
 * the simulation inputs, comparison, optimization and the recommendation.
 */
export interface ShelterDesign {
  type: ShelterType
  /** m — along the ridge / long axis */
  length: number
  /** m */
  width: number
  /** m — eave height (rectangular) or total height (A-frame, dome) */
  height: number
  /** deg — roof pitch (rectangular gable / A-frame). 0 = flat. Ignored by dome */
  roofAngle: number
  /** compass bearing (deg) the front facade faces. 180 = south */
  orientation: number
  windowCount: number
  /** m */
  windowWidth: number
  /** m */
  windowHeight: number
  /** m */
  doorWidth: number
  /** m */
  doorHeight: number
  /** mm */
  wallThickness: number
  /** mm */
  roofThickness: number
  /** mm */
  floorThickness: number
  /** mm — thermal-mass slab on the floor */
  massThickness: number
  wallMaterial: string
  roofMaterial: string
  floorMaterial: string
  windowMaterial: string
  thermalMassMaterial: string
}

export type Vec3 = [number, number, number]
export type Face = 'front' | 'back' | 'left' | 'right' | 'top' | 'all'
export type HostComponent = 'wall' | 'roof'
export type EnvelopeComponent = 'wall' | 'roof' | 'floor' | 'window' | 'door'

export interface Placement {
  id: string
  kind: 'window' | 'door'
  host: HostComponent
  face: Face
  /** shelter-local position (before orientation rotation) */
  position: Vec3
  /** shelter-local outward unit normal */
  normal: Vec3
  width: number
  height: number
}

export interface SurfaceDef {
  id: string
  component: 'wall' | 'roof' | 'floor'
  face: string
  /** net area (m²) after subtracting openings */
  area: number
  normal: Vec3
}

export interface DerivedGeometry {
  design: ShelterDesign
  floorArea: number
  volume: number
  ridgeHeight: number
  eaveHeight: number
  /** effective roof angle after clamping (deg) */
  roofAngleEff: number
  rise: number
  /** vertical knee/eave wall height */
  wallHeight: number
  slopeLength: number
  grossWall: number
  grossRoof: number
  netWall: number
  netRoof: number
  windowArea: number
  doorArea: number
  windows: Placement[]
  door: Placement
  surfaces: SurfaceDef[]
  envelopeArea: number
  surfaceToVolume: number
  /** window-to-wall ratio */
  wwr: number
  /** how many requested windows actually fit */
  windowsFitted: number
}
