import { getMaterial } from '../data/materials'
import { runMockSimulation, type SimulationInput } from '../data/mockSimulation'
import type { ShelterDesign, ShelterType } from '../types/shelter'
import type {
  CloudPoint,
  OptimizationCandidate,
  OptimizationPriority,
  OptimizationResult,
  SimulationResult,
} from '../types/simulation'
import {
  TYPE_PRESETS,
  clamp,
  deriveGeometry,
  designKey,
  nominalWindowArea,
  sanitizeDesign,
  withWindowArea,
} from './geometry'

export const OPT_PARAMS = [
  { id: 'shape', label: 'Shelter shape' },
  { id: 'length', label: 'Length' },
  { id: 'width', label: 'Width' },
  { id: 'height', label: 'Height' },
  { id: 'roofAngle', label: 'Roof angle' },
  { id: 'orientation', label: 'Orientation' },
  { id: 'windowArea', label: 'Window area' },
  { id: 'wallThickness', label: 'Wall thickness' },
  { id: 'materials', label: 'Materials' },
] as const

export type OptParamId = (typeof OPT_PARAMS)[number]['id']

export const PRIORITIES: { id: OptimizationPriority; label: string; blurb: string }[] = [
  { id: 'balanced', label: 'Balanced', blurb: 'Comfort, energy and heat loss weighted together' },
  { id: 'comfort', label: 'Max comfort', blurb: 'Favour hours inside 18–26 °C' },
  { id: 'energy', label: 'Min energy', blurb: 'Favour the lowest heating / cooling demand' },
]

const WEIGHTS: Record<OptimizationPriority, { comfort: number; energy: number; loss: number; cost: number }> = {
  balanced: { comfort: 0.4, energy: 0.3, loss: 0.2, cost: 0.1 },
  comfort: { comfort: 0.65, energy: 0.15, loss: 0.1, cost: 0.1 },
  energy: { comfort: 0.15, energy: 0.55, loss: 0.2, cost: 0.1 },
}

/** Small deterministic PRNG so the same inputs always give the same "AI" answer. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const pick = <T,>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]
const range = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo)

const WALL_MATS = ['composite', 'composite', 'polyurethane', 'fiberglass', 'wood', 'stone', 'rammed-earth', 'concrete']
const ROOF_MATS = ['composite', 'polyurethane', 'fiberglass', 'wood']
const FLOOR_MATS = ['fiberglass', 'polyurethane', 'composite', 'wood']
const GLAZING = ['double-glass', 'triple-lowe', 'triple-lowe', 'polycarbonate', 'single-glass']
const MASS_MATS = ['concrete', 'stone', 'water', 'rammed-earth']

/** Relative build-cost proxy: envelope area × thickness × material cost index. */
export function costProxy(d: ShelterDesign): number {
  const g = deriveGeometry(d)
  const s = g.design
  const layer = (area: number, mm: number, id: string) => area * (mm / 100) * getMaterial(id).costIndex
  return (
    layer(g.grossWall, s.wallThickness, s.wallMaterial) +
    layer(g.grossRoof, s.roofThickness, s.roofMaterial) +
    layer(g.floorArea, s.floorThickness, s.floorMaterial) +
    layer(g.floorArea, s.massThickness, s.thermalMassMaterial) * 0.6 +
    g.windowArea * 12 * getMaterial(s.windowMaterial).costIndex
  )
}

function sampleCandidate(rng: () => number, base: ShelterDesign, locked: Set<string>): ShelterDesign {
  const baseFloor = deriveGeometry(base).floorArea
  const d: ShelterDesign = { ...base }
  if (!locked.has('shape')) d.type = pick(rng, ['rectangular', 'aframe', 'dome'] as ShelterType[])
  if (d.type !== base.type) Object.assign(d, TYPE_PRESETS[d.type])

  for (let tries = 0; tries < 6; tries++) {
    if (!locked.has('length')) d.length = +range(rng, 4, 9).toFixed(1)
    if (!locked.has('width')) d.width = +range(rng, 3, 6).toFixed(1)
    if (!locked.has('height')) d.height = +range(rng, 2.3, 4).toFixed(1)
    const area = deriveGeometry(d).floorArea
    if (area >= baseFloor * 0.8 && area <= baseFloor * 1.45) break
    if (tries === 5) {
      // scale into the allowed habitable-area band rather than looping forever
      const f = Math.sqrt(clamp(area, baseFloor * 0.8, baseFloor * 1.45) / area)
      if (!locked.has('length')) d.length = +(d.length * f).toFixed(1)
      if (!locked.has('width')) d.width = +(d.width * f).toFixed(1)
    }
  }
  if (!locked.has('roofAngle')) {
    if (d.type === 'rectangular') d.roofAngle = Math.round(rng() < 0.3 ? 0 : range(rng, 5, 40))
    else if (d.type === 'aframe') d.roofAngle = Math.round(range(rng, 40, 70))
  }
  if (!locked.has('orientation')) d.orientation = Math.round(rng() < 0.7 ? range(rng, 110, 250) : range(rng, 0, 359))
  if (!locked.has('windowArea')) {
    const out = withWindowArea({ ...d, windowCount: Math.max(d.windowCount, 2) }, range(rng, 0.8, 6))
    d.windowCount = out.windowCount
    d.windowWidth = out.windowWidth
    d.windowHeight = out.windowHeight
  }
  if (!locked.has('wallThickness')) {
    d.wallThickness = Math.round(range(rng, 60, 300) / 10) * 10
    d.roofThickness = Math.round((d.wallThickness * range(rng, 0.9, 1.3)) / 10) * 10
  }
  if (!locked.has('materials')) {
    d.wallMaterial = pick(rng, WALL_MATS)
    d.roofMaterial = pick(rng, ROOF_MATS)
    d.floorMaterial = pick(rng, FLOOR_MATS)
    d.windowMaterial = pick(rng, GLAZING)
    d.thermalMassMaterial = pick(rng, MASS_MATS)
    d.massThickness = Math.round(range(rng, 0, 300) / 10) * 10
    d.floorThickness = Math.round(range(rng, 80, 200) / 10) * 10
  }
  return sanitizeDesign(d)
}

interface Evaluated {
  design: ShelterDesign
  result: SimulationResult
  cost: number
  score: number
}

const tick = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface OptimizeParams extends SimulationInput {
  locked?: string[]
  priority?: OptimizationPriority
  count?: number
}

export interface OptimizeProgress {
  done: number
  total: number
  points: CloudPoint[]
  phase: string
}

/**
 * MOCK AI optimisation: a seeded random search over the parameter space, every candidate scored by the
 * demo thermal engine. Replace with a call to a real optimiser / surrogate model behind services/api.ts.
 */
export async function optimizeDesign(
  params: OptimizeParams,
  onProgress?: (p: OptimizeProgress) => void,
  pace = true,
): Promise<OptimizationResult> {
  const { design, weather, settings } = params
  const locked = new Set(params.locked ?? [])
  const priority = params.priority ?? 'balanced'
  const total = params.count ?? 1200
  const rng = mulberry32(seedFrom(designKey(design) + weather.id + priority + [...locked].sort().join(',')))
  const base = sanitizeDesign(design)
  const baseline = runMockSimulation({ design: base, weather, settings })
  const baseCost = costProxy(base)

  const pool: Evaluated[] = []
  const chunk = 40
  for (let i = 0; i < total; i += chunk) {
    for (let j = i; j < Math.min(total, i + chunk); j++) {
      const cand = sampleCandidate(rng, base, locked)
      pool.push({ design: cand, result: runMockSimulation({ design: cand, weather, settings }), cost: costProxy(cand), score: 0 })
    }
    if (onProgress) {
      const phase = i < total * 0.35 ? 'Sampling geometry & orientation' : i < total * 0.7 ? 'Evaluating material stacks' : 'Ranking against comfort range'
      onProgress({
        done: Math.min(total, i + chunk),
        total,
        phase,
        points: pool.map((p) => ({ x: p.result.metrics.energyKWh, y: p.result.metrics.comfortHours, score: 0 })),
      })
    }
    if (pace) await tick(42)
  }

  // Score against pool extremes (plus the baseline so it is always comparable).
  const all = [...pool.map((p) => p.result.metrics), baseline.metrics]
  const maxE = Math.max(...all.map((m) => m.energyKWh), 1)
  const maxL = Math.max(...all.map((m) => m.heatLossKWh), 1)
  const maxC = Math.max(...pool.map((p) => p.cost), baseCost)
  const w = WEIGHTS[priority]
  for (const p of pool) {
    const m = p.result.metrics
    p.score = 100 * (w.comfort * (m.comfortPct / 100) + w.energy * (1 - m.energyKWh / maxE) + w.loss * (1 - m.heatLossKWh / maxL) + w.cost * (1 - p.cost / maxC))
  }

  const distance = (a: ShelterDesign, b: ShelterDesign) => {
    let dist = a.type !== b.type ? 1 : 0
    dist += Math.abs(a.orientation - b.orientation) / 90
    dist += Math.abs(nominalWindowArea(a) - nominalWindowArea(b)) / 3
    dist += Math.abs(a.wallThickness - b.wallThickness) / 150
    dist += (a.wallMaterial !== b.wallMaterial ? 0.3 : 0) + (a.thermalMassMaterial !== b.thermalMassMaterial ? 0.3 : 0) + (a.windowMaterial !== b.windowMaterial ? 0.2 : 0)
    dist += Math.abs(a.length * a.width - b.length * b.width) / 12
    return dist
  }

  const chosen: { p: Evaluated; tag: string }[] = []
  const take = (sorted: Evaluated[], tag: string, minDist = 0.7) => {
    const fresh = (p: Evaluated) => chosen.every((c) => distance(c.p.design, p.design) > minDist)
    // Prefer a shape we have not recommended yet so the three options are genuinely different.
    const found =
      sorted.find((p) => fresh(p) && p.score >= bestScore * 0.88 && chosen.every((c) => c.p.design.type !== p.design.type)) ?? sorted.find(fresh)
    if (found) chosen.push({ p: found, tag })
  }
  const byScore = [...pool].sort((a, b) => b.score - a.score)
  const bestScore = byScore[0].score
  const topPct = byScore.slice(0, Math.max(30, Math.floor(total * 0.25)))
  take(byScore, 'Balanced performer')
  const maxComfort = Math.max(...topPct.map((p) => p.result.metrics.comfortHours))
  take(
    topPct
      .filter((p) => p.result.metrics.comfortHours >= maxComfort * 0.6)
      .sort((a, b) => a.result.metrics.energyKWh - b.result.metrics.energyKWh || b.score - a.score),
    'Lowest energy demand',
  )
  take(
    [...topPct].sort((a, b) => b.result.metrics.comfortHours - a.result.metrics.comfortHours || b.result.metrics.solarGainKWh - a.result.metrics.solarGainKWh),
    'Solar-forward comfort',
  )
  for (const p of byScore) {
    if (chosen.length >= 3) break
    if (!chosen.some((c) => c.p === p)) chosen.push({ p, tag: 'Alternative' })
  }

  const candidates: OptimizationCandidate[] = chosen.slice(0, 3).map(({ p, tag }, i) => ({
    id: `rec-${i + 1}`,
    rank: i + 1,
    label: `Recommended Design ${i + 1}`,
    tag,
    design: p.design,
    metrics: p.result.metrics,
    score: p.score,
    relCost: (p.cost / baseCost) * 100,
    envelope: p.result.envelope,
    reasons: explainChange(baseline, p.result),
  }))

  // Pareto front on (energy ↓, comfort ↑)
  const cloud: CloudPoint[] = pool.map((p) => ({ x: p.result.metrics.energyKWh, y: p.result.metrics.comfortHours, score: p.score }))
  cloud.forEach((c, i) => {
    c.pareto = !cloud.some((o, j) => j !== i && o.x <= c.x && o.y >= c.y && (o.x < c.x || o.y > c.y))
  })

  return {
    id: `opt-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    evaluated: total,
    baseline: baseline.metrics,
    baselineDesign: base,
    candidates,
    cloud,
    locked: [...locked],
    priority,
  }
}

const pct = (a: number, b: number) => (a === 0 ? 0 : ((b - a) / Math.abs(a)) * 100)
const shapeName = (t: ShelterType) => (t === 'aframe' ? 'A-frame' : t === 'dome' ? 'dome' : 'rectangular')

/**
 * Plain-language explanation of what changed between two simulated designs.
 * Every statement is derived from the demo simulation — illustrative, not a verified engineering conclusion.
 */
export function explainChange(from: SimulationResult, to: SimulationResult): string[] {
  const a = from.design
  const b = to.design
  const out: string[] = []
  const uA = from.envelope.uValue
  const uB = to.envelope.uValue

  if (uB.walls < uA.walls * 0.9 || uB.roof < uA.roof * 0.9) {
    const wallCut = -pct(from.lossKWh.walls + from.lossKWh.roof, to.lossKWh.walls + to.lossKWh.roof)
    out.push(
      `Higher insulation lowers wall U-value ${uA.walls.toFixed(2)} → ${uB.walls.toFixed(2)} W/m²K, cutting simulated wall + roof heat loss by ${Math.max(0, wallCut).toFixed(0)}%.`,
    )
  }
  const wa = from.envelope.windowArea
  const wb = to.envelope.windowArea
  if (wb < wa * 0.85) {
    out.push(`Reduced window area (${wa.toFixed(1)} → ${wb.toFixed(1)} m²) improves thermal retention — window losses fall ${(-pct(from.lossKWh.windows, to.lossKWh.windows)).toFixed(0)}%.`)
  } else if (wb > wa * 1.15) {
    out.push(`More glazing (${wa.toFixed(1)} → ${wb.toFixed(1)} m²) raises simulated solar gain by ${pct(from.metrics.solarGainKWh, to.metrics.solarGainKWh).toFixed(0)}% during the day.`)
  }
  const offA = Math.abs(((a.orientation - 180 + 540) % 360) - 180)
  const offB = Math.abs(((b.orientation - 180 + 540) % 360) - 180)
  if (offB < offA - 12) {
    out.push(`Orientation ${Math.round(b.orientation)}° sits closer to due south, increasing solar exposure of the glazing (solar gain ${pct(from.metrics.solarGainKWh, to.metrics.solarGainKWh) >= 0 ? '+' : ''}${pct(from.metrics.solarGainKWh, to.metrics.solarGainKWh).toFixed(0)}%).`)
  }
  const massA = a.massThickness * getMaterial(a.thermalMassMaterial).density * getMaterial(a.thermalMassMaterial).specificHeat
  const massB = b.massThickness * getMaterial(b.thermalMassMaterial).density * getMaterial(b.thermalMassMaterial).specificHeat
  if (massB > massA * 1.25) {
    const rngA = from.metrics.maxIndoor - from.metrics.minIndoor
    const rngB = to.metrics.maxIndoor - to.metrics.minIndoor
    out.push(`Thermal mass (${b.massThickness} mm ${getMaterial(b.thermalMassMaterial).name.toLowerCase()}) smooths the indoor swing: ${rngA.toFixed(1)} → ${rngB.toFixed(1)} °C over the day.`)
  }
  if (a.type !== b.type) {
    const gA = deriveGeometry(a)
    const gB = deriveGeometry(b)
    out.push(`${shapeName(b.type)[0].toUpperCase() + shapeName(b.type).slice(1)} form changes envelope-to-volume ratio ${gA.surfaceToVolume.toFixed(2)} → ${gB.surfaceToVolume.toFixed(2)} m⁻¹, altering how much surface is exposed to the cold.`)
  }
  if (b.windowMaterial !== a.windowMaterial && uB.windows < uA.windows * 0.85) {
    out.push(`${getMaterial(b.windowMaterial).name} lowers window U-value ${uA.windows.toFixed(2)} → ${uB.windows.toFixed(2)} W/m²K.`)
  }
  if (out.length === 0) out.push('Small adjustments across several parameters combine into a modest improvement in the simulated balance.')
  return out.slice(0, 5)
}
