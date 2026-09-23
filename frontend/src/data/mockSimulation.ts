import type { HourlyWeather, WeatherData } from '../types/project'
import type { DerivedGeometry, ShelterDesign } from '../types/shelter'
import type {
  EnvelopeSummary,
  HourlyResult,
  LossKey,
  SimulationMetrics,
  SimulationResult,
  SimulationSettings,
} from '../types/simulation'
import { deriveGeometry, designKey, localToWorld } from '../utils/geometry'
import {
  R_SI,
  SKY_LONGWAVE_DELTA,
  exteriorFilm,
  irradianceOnSurface,
  sampleWeather,
  sunPosition,
  type SunPosition,
} from '../utils/thermal'
import { DOOR_MATERIAL, DOOR_THICKNESS_MM, getMaterial } from './materials'

/**
 * DEMO thermal engine — a deterministic lumped-capacity model (one air node + effective thermal mass,
 * steady-state conduction through each component, sol-air opaque gains, transmitted window gains and
 * ventilation loss). It is deliberately simple and NOT a validated building-energy simulation.
 * Swap this module for a real backend (Python / ANSYS / EnergyPlus) via services/api.ts.
 */

export const DEFAULT_SETTINGS: SimulationSettings = {
  startHour: 6,
  endHour: 23,
  timeStep: 1,
  comfortMin: 18,
  comfortMax: 26,
  ventilationACH: 0.8,
  occupants: 2,
}

export interface SimulationInput {
  design: ShelterDesign
  weather: WeatherData
  settings: SimulationSettings
}

const OCCUPANT_WATTS = 90
const AIR_WH_PER_M3K = 0.335
const FURNISHING_FACTOR = 4
const FRAME_FRACTION = 0.2
const FRAME_U = 2.2
/** Depth of material taking part in the daily heat swing (m). */
const ACTIVE_DEPTH = 0.12

const layerU = (k: number, mm: number, rsi: number, rso: number) => 1 / (rsi + mm / 1000 / k + rso)

interface DayStep {
  hour: number
  weather: HourlyWeather
  sun: SunPosition
}

const dayCache = new WeakMap<WeatherData, Map<number, DayStep[]>>()

function dayTable(w: WeatherData, dt: number): DayStep[] {
  let byStep = dayCache.get(w)
  if (!byStep) dayCache.set(w, (byStep = new Map()))
  let t = byStep.get(dt)
  if (!t) {
    t = Array.from({ length: Math.round(24 / dt) }, (_, i) => {
      const hour = i * dt
      return { hour, weather: sampleWeather(w, hour), sun: sunPosition(w.latitude, w.dayOfYear, hour) }
    })
    byStep.set(dt, t)
  }
  return t
}

export interface Envelope {
  summary: EnvelopeSummary
  uWall: number
  uRoof: number
  uFloor: number
  uWindow: number
  uDoor: number
  shgc: number
  wallAbs: number
  wallEps: number
  roofAbs: number
  roofEps: number
  capacity: number
  rsoNominal: number
}

export function buildEnvelope(geo: DerivedGeometry, settings: SimulationSettings, meanWind: number): Envelope {
  const d = geo.design
  const ho = exteriorFilm(meanWind)
  const rso = 1 / ho
  const wall = getMaterial(d.wallMaterial)
  const roof = getMaterial(d.roofMaterial)
  const floor = getMaterial(d.floorMaterial)
  const glass = getMaterial(d.windowMaterial)
  const mass = getMaterial(d.thermalMassMaterial)

  const uWall = layerU(wall.conductivity, d.wallThickness, R_SI.wall, rso)
  const uRoof = layerU(roof.conductivity, d.roofThickness, R_SI.roof, rso)
  // Floor: layer + mass slab + a fixed ground-coupling resistance
  const rFloor = R_SI.floor + d.floorThickness / 1000 / floor.conductivity + d.massThickness / 1000 / mass.conductivity + 0.5
  const uFloor = 1 / rFloor
  const uGlass = layerU(glass.conductivity, glass.thickness, R_SI.window, rso)
  const uWindow = (1 - FRAME_FRACTION) * uGlass + FRAME_FRACTION * FRAME_U
  const uDoor = layerU(DOOR_MATERIAL.conductivity, DOOR_THICKNESS_MM, R_SI.door, rso)
  const shgc = (glass.shgc ?? 0.7) * (1 - FRAME_FRACTION)

  const area = { walls: geo.netWall, roof: geo.netRoof, floor: geo.floorArea, windows: geo.windowArea, door: geo.doorArea }
  const uValue = { walls: uWall, roof: uRoof, floor: uFloor, windows: uWindow, door: uDoor }
  const ua: EnvelopeSummary['ua'] = {
    walls: uWall * area.walls,
    roof: uRoof * area.roof,
    floor: uFloor * area.floor,
    windows: uWindow * area.windows,
    door: uDoor * area.door,
    ventilation: AIR_WH_PER_M3K * geo.volume * settings.ventilationACH * (1 + 0.06 * meanWind),
  }
  const totalUA = Object.values(ua).reduce((s, x) => s + x, 0)

  const cap = (m: { density: number; specificHeat: number }, mm: number, a: number, maxDepth = ACTIVE_DEPTH) =>
    (m.density * m.specificHeat * Math.min(mm / 1000, maxDepth) * a * 0.5) / 3600
  const capacity =
    AIR_WH_PER_M3K * geo.volume * FURNISHING_FACTOR +
    cap(wall, d.wallThickness, area.walls) +
    cap(roof, d.roofThickness, area.roof) +
    cap(floor, d.floorThickness, area.floor) +
    (d.massThickness > 0 ? (mass.density * mass.specificHeat * Math.min(d.massThickness / 1000, 0.25) * area.floor) / 3600 : 0)

  return {
    summary: {
      area, uValue, ua, totalUA, capacity,
      timeConstant: capacity / Math.max(totalUA, 0.1),
      windowArea: geo.windowArea, volume: geo.volume, floorArea: geo.floorArea,
    },
    uWall, uRoof, uFloor, uWindow, uDoor, shgc,
    wallAbs: wall.absorptivity, wallEps: wall.emissivity, roofAbs: roof.absorptivity, roofEps: roof.emissivity,
    capacity, rsoNominal: rso,
  }
}

const LOSS_KEYS: LossKey[] = ['walls', 'roof', 'floor', 'windows', 'door', 'ventilation']
const zeroLoss = (): Record<LossKey, number> => ({ walls: 0, roof: 0, floor: 0, windows: 0, door: 0, ventilation: 0 })

interface StepData {
  hour: number
  Tout: number
  ghi: number
  uaVent: number
  qWin: number
  absWall: number
  absRoof: number
  lwWall: number
  lwRoof: number
  uaWallSol: number
  uaRoofSol: number
}

const MAX_DAYS = 45
const CONVERGED = 0.05

export function runMockSimulation({ design, weather, settings }: SimulationInput): SimulationResult {
  const geo = deriveGeometry(design)
  const d = geo.design
  const dt = settings.timeStep
  const table = dayTable(weather, dt)
  const n = table.length
  const meanWind = table.reduce((s, x) => s + x.weather.wind, 0) / n
  const env = buildEnvelope(geo, settings, meanWind)
  const ho = 1 / env.rsoNominal

  // Pre-rotate normals into world space once per design.
  const surfaces = geo.surfaces
    .filter((s) => s.component !== 'floor')
    .map((s) => {
      const isWall = s.component === 'wall'
      return {
        world: localToWorld(s.normal, d.orientation),
        ua: (isWall ? env.uWall : env.uRoof) * s.area,
        abs: isWall ? env.wallAbs : env.roofAbs,
        eps: isWall ? env.wallEps : env.roofEps,
        isWall,
      }
    })
  const windows = geo.windows.map((w) => ({ world: localToWorld(w.normal, d.orientation), area: w.width * w.height }))

  const ua = env.summary.ua
  const internal = settings.occupants * OCCUPANT_WATTS
  const groundT = weather.groundTemp
  const ventBase = ua.ventilation / (1 + 0.06 * meanWind)

  // The weather profile repeats daily, so every boundary term can be computed once per time-of-day.
  const steps: StepData[] = table.map((step) => {
    const w = step.weather
    const sky = { ghi: w.solar, sun: step.sun, albedo: weather.albedo }
    let qWin = 0
    for (const win of windows) qWin += win.area * env.shgc * irradianceOnSurface(win.world, sky)
    let absWall = 0, absRoof = 0, lwWall = 0, lwRoof = 0, uaWallSol = 0, uaRoofSol = 0
    for (const sf of surfaces) {
      const I = irradianceOnSurface(sf.world, sky)
      const gain = (sf.ua * sf.abs * I) / ho
      const lw = (sf.ua * sf.eps * SKY_LONGWAVE_DELTA * ((1 + sf.world[1]) / 2)) / ho
      if (sf.isWall) { absWall += gain; lwWall += lw; uaWallSol += gain - lw }
      else { absRoof += gain; lwRoof += lw; uaRoofSol += gain - lw }
    }
    return {
      hour: step.hour, Tout: w.temperature, ghi: w.solar, uaVent: ventBase * (1 + 0.06 * w.wind),
      qWin, absWall, absRoof, lwWall, lwRoof, uaWallSol, uaRoofSol,
    }
  })

  const derive = (sd: StepData) => {
    const uaTot = ua.walls + ua.roof + ua.floor + ua.windows + ua.door + sd.uaVent
    const gains = sd.qWin + sd.absWall + sd.absRoof - sd.lwWall - sd.lwRoof + internal
    const sources = (ua.walls + ua.roof + ua.windows + ua.door + sd.uaVent) * sd.Tout + ua.floor * groundT
    const Teq = (sources + gains) / uaTot
    const tau = env.capacity / uaTot
    return { uaTot, Teq, tau, decay: Math.exp(-dt / tau) }
  }

  // State: Tf = free-floating indoor temperature, Tc = thermostat-controlled temperature (for energy demand).
  let Tf = steps.reduce((s, sd) => s + derive(sd).Teq, 0) / n
  let Tc = Tf
  const rows: HourlyResult[] = []

  const runDay = (report: boolean) => {
    for (const sd of steps) {
      const { uaTot, Teq, tau, decay } = derive(sd)
      const Tout = sd.Tout
      const Tstart = Tf
      const Tend = Teq + (Tstart - Teq) * decay
      const Tavg = Teq + (Tstart - Teq) * (tau / dt) * (1 - decay)

      // Controlled run: constant plant power over the step that just holds the comfort range.
      const free = Teq + (Tc - Teq) * decay
      let plant = 0
      if (free < settings.comfortMin) plant = ((settings.comfortMin - free) * uaTot) / (1 - decay)
      else if (free > settings.comfortMax) plant = ((settings.comfortMax - free) * uaTot) / (1 - decay)
      Tc = free + (plant * (1 - decay)) / uaTot

      if (report && sd.hour >= settings.startHour - 1e-9 && sd.hour <= settings.endHour + 1e-9) {
        const lossByComponent: Record<LossKey, number> = {
          walls: ua.walls * (Tavg - Tout) + sd.lwWall,
          roof: ua.roof * (Tavg - Tout) + sd.lwRoof,
          floor: ua.floor * (Tavg - groundT),
          windows: ua.windows * (Tavg - Tout),
          door: ua.door * (Tavg - Tout),
          ventilation: sd.uaVent * (Tavg - Tout),
        }
        const heatLoss = LOSS_KEYS.reduce((sum, k) => sum + lossByComponent[k], 0)
        const solarGain = sd.qWin + sd.absWall + sd.absRoof
        const wallEff = ua.walls > 0 ? Tout + sd.uaWallSol / ua.walls : Tout
        const roofEff = ua.roof > 0 ? Tout + sd.uaRoofSol / ua.roof : Tout
        const si = (u: number, rsi: number, tEff: number) => Tavg - u * (Tavg - tEff) * rsi
        const flux = (u: number, tEff: number) => u * (Tavg - tEff)
        rows.push({
          hour: sd.hour,
          outdoorTemp: Tout,
          indoorTemp: Tstart,
          solarRadiation: sd.ghi,
          solarGain,
          heatLoss,
          internalGain: internal,
          netGain: solarGain + internal - heatLoss,
          energyDemand: Math.abs(plant),
          heatingDemand: Math.max(0, plant),
          coolingDemand: Math.max(0, -plant),
          lossByComponent,
          surfaceTemp: {
            walls: si(env.uWall, R_SI.wall, wallEff),
            roof: si(env.uRoof, R_SI.roof, roofEff),
            floor: si(env.uFloor, R_SI.floor, groundT),
            windows: si(env.uWindow, R_SI.window, Tout),
            door: si(env.uDoor, R_SI.door, Tout),
          },
          surfaceFlux: {
            walls: flux(env.uWall, wallEff),
            roof: flux(env.uRoof, roofEff),
            floor: flux(env.uFloor, groundT),
            windows: flux(env.uWindow, Tout),
            door: flux(env.uDoor, Tout),
          },
          comfortable: Tstart >= settings.comfortMin && Tstart <= settings.comfortMax,
        })
      }
      Tf = Tend
    }
  }

  // Iterate to a periodic steady state (heavy shelters have time constants of several days).
  for (let day = 0; day < MAX_DAYS; day++) {
    const f0 = Tf
    const c0 = Tc
    runDay(false)
    if (day >= 2 && Math.abs(Tf - f0) < CONVERGED && Math.abs(Tc - c0) < CONVERGED) break
  }
  runDay(true)

  const kwh = (f: (r: HourlyResult) => number) => rows.reduce((s, r) => s + f(r) * dt, 0) / 1000
  const lossKWh = zeroLoss()
  for (const k of LOSS_KEYS) lossKWh[k] = Math.max(0, kwh((r) => r.lossByComponent[k]))
  const temps = rows.map((r) => r.indoorTemp)
  const comfortHours = rows.filter((r) => r.comfortable).length * dt
  const totalHours = rows.length * dt

  const metrics: SimulationMetrics = {
    avgIndoor: temps.reduce((s, x) => s + x, 0) / Math.max(temps.length, 1),
    minIndoor: Math.min(...temps),
    maxIndoor: Math.max(...temps),
    avgOutdoor: rows.reduce((s, r) => s + r.outdoorTemp, 0) / Math.max(rows.length, 1),
    solarGainKWh: kwh((r) => r.solarGain),
    heatLossKWh: Math.max(0, kwh((r) => Math.max(0, r.heatLoss))),
    netKWh: kwh((r) => r.netGain),
    comfortHours,
    totalHours,
    comfortPct: totalHours > 0 ? (comfortHours / totalHours) * 100 : 0,
    energyKWh: kwh((r) => r.energyDemand),
    heatingKWh: kwh((r) => r.heatingDemand),
    coolingKWh: kwh((r) => r.coolingDemand),
  }

  return {
    id: `sim-${Math.abs(hash(designKey(design) + weather.id + JSON.stringify(settings))).toString(36)}`,
    createdAt: new Date().toISOString(),
    key: simulationKey(design, weather, settings),
    design: d,
    settings,
    weatherLabel: `${weather.location} · ${weather.sourceLabel}`,
    hourly: rows,
    metrics,
    lossKWh,
    envelope: env.summary,
  }
}

export function simulationKey(design: ShelterDesign, weather: WeatherData, settings: SimulationSettings): string {
  const w = weather.hourly.reduce((s, h) => s + h.temperature * 3 + h.solar, 0).toFixed(1)
  return `${designKey(design)}|${weather.id}|${w}|${JSON.stringify(settings)}`
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h | 0
}
