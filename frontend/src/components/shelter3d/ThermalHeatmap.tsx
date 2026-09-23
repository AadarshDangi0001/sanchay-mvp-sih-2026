import * as THREE from 'three'
import { getMaterial } from '../../data/materials'
import type { WeatherData } from '../../types/project'
import type { ShelterDesign, Vec3 } from '../../types/shelter'
import type { SimulationResult, SurfaceKey } from '../../types/simulation'
import { skyAt, irradianceLocal } from '../../utils/thermal'
import type { Part } from './generators'

export type ThermalMode = 'normal' | 'temperature' | 'heatloss' | 'solar'

export const THERMAL_MODES: { id: ThermalMode; label: string; short: string }[] = [
  { id: 'normal', label: 'Normal', short: 'Normal' },
  { id: 'temperature', label: 'Temperature', short: 'Temp' },
  { id: 'heatloss', label: 'Heat loss', short: 'Loss' },
  { id: 'solar', label: 'Solar exposure', short: 'Solar' },
]

export interface ThermalView {
  mode: ThermalMode
  /** index into result.hourly */
  hourIndex: number
  result: SimulationResult
  weather: WeatherData
}

export type PaintKind = 'wall' | 'roof' | 'floor' | 'mass' | 'window' | 'door'

export interface MatProps {
  color: string
  roughness: number
  metalness: number
  emissive?: string
  emissiveIntensity?: number
  opacity: number
  transparent: boolean
}

export interface Paint {
  mode: ThermalMode
  mat: (kind: PaintKind) => MatProps
  /** when set, wall/roof parts are painted per-vertex (solar exposure) */
  vertex?: (geo: THREE.BufferGeometry, part: Part) => void
}

/** Blue → cyan → yellow → red, the "Low / Medium / High" ramp. */
const STOPS: [number, string][] = [
  [0, '#2f5bff'],
  [0.28, '#22c7e8'],
  [0.6, '#ffd23f'],
  [1, '#ff3b30'],
]
const STOP_COLORS = STOPS.map(([, c]) => new THREE.Color(c))

export function heatColor(t: number, target = new THREE.Color()): THREE.Color {
  const x = Math.min(1, Math.max(0, t))
  for (let i = 1; i < STOPS.length; i++) {
    if (x <= STOPS[i][0]) {
      const f = (x - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])
      return target.copy(STOP_COLORS[i - 1]).lerp(STOP_COLORS[i], f)
    }
  }
  return target.copy(STOP_COLORS[STOP_COLORS.length - 1])
}

export const heatHex = (t: number) => `#${heatColor(t).getHexString()}`
export const RAMP_CSS = `linear-gradient(to right, ${STOPS.map(([p, c]) => `${c} ${p * 100}%`).join(', ')})`

export interface ThermalRange {
  min: number
  max: number
  unit: string
  title: string
}

const SURFACE_KEYS: SurfaceKey[] = ['walls', 'roof', 'floor', 'windows', 'door']

export function thermalRange(mode: ThermalMode, result: SimulationResult, weather: WeatherData): ThermalRange {
  if (mode === 'temperature') {
    // Scale from the coldest outdoor hour up to the top of the comfort range so colour reads as
    // "how close to comfortable" rather than exaggerating tiny differences.
    const all = result.hourly.flatMap((h) => SURFACE_KEYS.map((k) => h.surfaceTemp[k]).concat(h.outdoorTemp))
    return {
      min: Math.floor(Math.min(...all)),
      max: Math.max(result.settings.comfortMax, Math.ceil(Math.max(...all))),
      unit: '°C',
      title: 'Inside surface temperature',
    }
  }
  if (mode === 'heatloss') {
    const all = result.hourly.flatMap((h) => SURFACE_KEYS.map((k) => Math.max(0, h.surfaceFlux[k])))
    return { min: 0, max: Math.max(5, Math.ceil(Math.max(...all))), unit: 'W/m²', title: 'Conductive heat flux' }
  }
  const peak = Math.max(...weather.hourly.map((h) => h.solar), 1)
  return { min: 0, max: Math.max(300, Math.round((peak * 1.25) / 50) * 50), unit: 'W/m²', title: 'Incident solar irradiance' }
}

const KIND_TO_SURFACE: Record<PaintKind, SurfaceKey> = {
  wall: 'walls', roof: 'roof', floor: 'floor', mass: 'floor', window: 'windows', door: 'door',
}

const designMat = (d: ShelterDesign, kind: PaintKind) => {
  switch (kind) {
    case 'wall': return getMaterial(d.wallMaterial)
    case 'roof': return getMaterial(d.roofMaterial)
    case 'floor': return getMaterial(d.floorMaterial)
    case 'mass': return getMaterial(d.thermalMassMaterial)
    case 'window': return getMaterial(d.windowMaterial)
    default: return getMaterial('wood')
  }
}

export function makePaint(design: ShelterDesign, view?: ThermalView): Paint {
  const normal = (kind: PaintKind): MatProps => {
    const m = designMat(design, kind)
    if (kind === 'window') {
      return { color: m.color, roughness: 0.04, metalness: 0.1, opacity: 0.42, transparent: true, emissive: '#4fc3f7', emissiveIntensity: 0.06 }
    }
    if (kind === 'door') return { color: '#8a5a33', roughness: 0.7, metalness: 0, opacity: 1, transparent: false }
    return { color: m.color, roughness: m.roughness, metalness: m.metalness, opacity: 1, transparent: false }
  }

  if (!view || view.mode === 'normal') return { mode: 'normal', mat: normal }

  const { mode, result, weather } = view
  const range = thermalRange(mode, result, weather)
  const row = result.hourly[Math.min(view.hourIndex, result.hourly.length - 1)]
  const lin = (v: number) => Math.min(1, Math.max(0, (v - range.min) / (range.max - range.min || 1)))
  // Conductive flux spans a wide range (windows ≫ insulated walls), so ease it to keep walls visible.
  const norm = mode === 'heatloss' ? (v: number) => Math.pow(lin(v), 0.5) : lin

  if (mode === 'temperature' || mode === 'heatloss') {
    return {
      mode,
      mat: (kind) => {
        const key = KIND_TO_SURFACE[kind]
        const v = mode === 'temperature' ? row.surfaceTemp[key] : Math.max(0, row.surfaceFlux[key])
        const c = heatHex(norm(v))
        return {
          color: c, roughness: 0.75, metalness: 0, emissive: c, emissiveIntensity: 0.28,
          opacity: kind === 'window' ? 0.92 : 1, transparent: kind === 'window',
        }
      },
    }
  }

  // Solar exposure: per-vertex irradiance from the surface normal, sun position and shelter orientation.
  const sky = skyAt(weather, row.hour)
  const cache = new Map<string, number>()
  const irradiance = (n: Vec3): number => {
    const key = `${n[0].toFixed(2)},${n[1].toFixed(2)},${n[2].toFixed(2)}`
    let v = cache.get(key)
    if (v === undefined) cache.set(key, (v = irradianceLocal(n, design.orientation, sky)))
    return v
  }
  const tmp = new THREE.Color()
  const euler = new THREE.Euler()
  const vec = new THREE.Vector3()
  return {
    mode,
    mat: (kind) => {
      if (kind === 'wall' || kind === 'roof') {
        return { color: '#ffffff', roughness: 0.85, metalness: 0, opacity: 1, transparent: false }
      }
      const value = kind === 'floor' || kind === 'mass' ? 0 : irradiance(kind === 'window' || kind === 'door' ? [0, 0, 1] : [0, 1, 0])
      const c = heatHex(norm(value))
      return { color: c, roughness: 0.75, metalness: 0, emissive: c, emissiveIntensity: 0.2, opacity: kind === 'window' ? 0.9 : 1, transparent: kind === 'window' }
    },
    vertex: (geo, part) => {
      const normalAttr = geo.getAttribute('normal')
      if (!normalAttr) return
      const count = normalAttr.count
      let color = geo.getAttribute('color') as THREE.BufferAttribute | undefined
      if (!color || color.count !== count) {
        color = new THREE.BufferAttribute(new Float32Array(count * 3), 3)
        geo.setAttribute('color', color)
      }
      euler.set(part.rotation[0], part.rotation[1], part.rotation[2], part.order)
      for (let i = 0; i < count; i++) {
        vec.fromBufferAttribute(normalAttr, i).applyEuler(euler)
        heatColor(norm(irradiance([vec.x, vec.y, vec.z])), tmp)
        color.setXYZ(i, tmp.r, tmp.g, tmp.b)
      }
      color.needsUpdate = true
    },
  }
}
