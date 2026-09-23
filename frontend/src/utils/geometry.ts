import { MATERIAL_MAP, getMaterial } from '../data/materials'
import type { DerivedGeometry, Face, Placement, ShelterDesign, ShelterType, SurfaceDef, Vec3 } from '../types/shelter'

export const DEG = Math.PI / 180

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export interface Limit {
  min: number
  max: number
  step: number
  unit: string
  label: string
}

export const DESIGN_LIMITS = {
  length: { min: 2, max: 20, step: 0.1, unit: 'm', label: 'Length' },
  width: { min: 2, max: 12, step: 0.1, unit: 'm', label: 'Width' },
  height: { min: 2, max: 8, step: 0.1, unit: 'm', label: 'Height' },
  roofAngle: { min: 0, max: 75, step: 1, unit: '°', label: 'Roof angle' },
  orientation: { min: 0, max: 359, step: 1, unit: '°', label: 'Orientation' },
  windowCount: { min: 0, max: 8, step: 1, unit: '', label: 'Window count' },
  windowWidth: { min: 0.3, max: 3, step: 0.05, unit: 'm', label: 'Window width' },
  windowHeight: { min: 0.3, max: 2.5, step: 0.05, unit: 'm', label: 'Window height' },
  doorWidth: { min: 0.6, max: 2, step: 0.05, unit: 'm', label: 'Door width' },
  doorHeight: { min: 1.6, max: 2.6, step: 0.05, unit: 'm', label: 'Door height' },
  wallThickness: { min: 2, max: 500, step: 1, unit: 'mm', label: 'Wall thickness' },
  roofThickness: { min: 2, max: 500, step: 1, unit: 'mm', label: 'Roof thickness' },
  floorThickness: { min: 5, max: 500, step: 5, unit: 'mm', label: 'Floor thickness' },
  massThickness: { min: 0, max: 400, step: 10, unit: 'mm', label: 'Thermal mass thickness' },
} satisfies Record<string, Limit>

export type NumericKey = keyof typeof DESIGN_LIMITS

export const COMPASS = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
]

export function bearingLabel(deg: number): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}

export const SHELTER_TYPES: { id: ShelterType; label: string; blurb: string }[] = [
  { id: 'rectangular', label: 'Rectangular', blurb: 'Vertical walls with a flat or gabled roof' },
  { id: 'aframe', label: 'A-Frame', blurb: 'Steep roof planes shed snow and wind' },
  { id: 'dome', label: 'Dome', blurb: 'Minimal surface area, best surface-to-volume' },
]

export const TYPE_PRESETS: Record<ShelterType, Pick<ShelterDesign, 'length' | 'width' | 'height' | 'roofAngle'>> = {
  rectangular: { length: 6, width: 4, height: 3, roofAngle: 0 },
  aframe: { length: 6, width: 4, height: 3, roofAngle: 35 },
  dome: { length: 5, width: 5, height: 2.8, roofAngle: 0 },
}

/** The worked example from the brief: a 6×4×3 m A-frame, south-facing, 120 mm composite insulation. */
export const DEFAULT_DESIGN: ShelterDesign = {
  type: 'aframe',
  length: 6,
  width: 4,
  height: 3,
  roofAngle: 35,
  orientation: 180,
  windowCount: 2,
  windowWidth: 1.0,
  windowHeight: 0.9,
  doorWidth: 0.9,
  doorHeight: 2.0,
  wallThickness: 120,
  roofThickness: 120,
  floorThickness: 100,
  massThickness: 100,
  wallMaterial: 'composite',
  roofMaterial: 'composite',
  floorMaterial: 'fiberglass',
  windowMaterial: 'double-glass',
  thermalMassMaterial: 'concrete',
}

export function applyTypePreset(design: ShelterDesign, type: ShelterType): ShelterDesign {
  return { ...design, type, ...TYPE_PRESETS[type] }
}

/** Clamp every field to a safe range so geometry and physics never see nonsense. */
export function sanitizeDesign(d: ShelterDesign): ShelterDesign {
  const out = { ...d }
  for (const key of Object.keys(DESIGN_LIMITS) as NumericKey[]) {
    const lim = DESIGN_LIMITS[key]
    const v = Number.isFinite(out[key]) ? out[key] : lim.min
    out[key] = clamp(v, lim.min, lim.max) as never
  }
  out.windowCount = Math.round(out.windowCount)
  out.orientation = ((out.orientation % 360) + 360) % 360
  for (const k of ['wallMaterial', 'roofMaterial', 'floorMaterial', 'windowMaterial', 'thermalMassMaterial'] as const) {
    if (!MATERIAL_MAP[out[k]]) out[k] = DEFAULT_DESIGN[k]
  }
  const range = (id: string) => getMaterial(id).thicknessRange
  out.wallThickness = clamp(out.wallThickness, ...range(out.wallMaterial))
  out.roofThickness = clamp(out.roofThickness, ...range(out.roofMaterial))
  out.floorThickness = clamp(out.floorThickness, ...range(out.floorMaterial))
  return out
}

/** Nominal (requested) window area in m². */
export const nominalWindowArea = (d: ShelterDesign) => d.windowCount * d.windowWidth * d.windowHeight

/** Rescale window width/height so the nominal glazing area hits `area`. */
export function withWindowArea(d: ShelterDesign, area: number): ShelterDesign {
  const count = d.windowCount === 0 ? 2 : d.windowCount
  const cur = count * d.windowWidth * d.windowHeight
  const s = Math.sqrt(Math.max(area, 0.05) / cur)
  const wl = DESIGN_LIMITS.windowWidth
  const hl = DESIGN_LIMITS.windowHeight
  return {
    ...d,
    windowCount: count,
    windowWidth: +clamp(d.windowWidth * s, wl.min, wl.max).toFixed(2),
    windowHeight: +clamp(d.windowHeight * s, hl.min, hl.max).toFixed(2),
  }
}

export function designKey(d: ShelterDesign): string {
  return JSON.stringify(sanitizeDesign(d), (_k, v) => (typeof v === 'number' ? +v.toFixed(3) : v))
}

export function designLabel(d: ShelterDesign): string {
  const t = SHELTER_TYPES.find((s) => s.id === d.type)!.label
  return `${t} · ${d.length.toFixed(1)}×${d.width.toFixed(1)}×${d.height.toFixed(1)} m`
}

/* -------------------------------------------------------------------------- */
/*  Openings layout (shared by 3D + thermal engine)                           */
/* -------------------------------------------------------------------------- */

function fitSpan(count: number, span: number, w: number, margin = 0.3, gap = 0.25) {
  let n = count
  while (n > 0 && (span - 2 * margin) / n < 0.3 + gap) n--
  if (n <= 0) return { n: 0, w: 0, centers: [] as number[] }
  const per = (span - 2 * margin) / n
  const ww = clamp(Math.min(w, per - gap), 0.3, w)
  const centers = Array.from({ length: n }, (_, i) => -span / 2 + margin + per * (i + 0.5))
  return { n, w: ww, centers }
}

function faceCounts(type: ShelterType, n: number) {
  if (type === 'aframe') {
    const front = Math.ceil(n * 0.6)
    return { front, back: n - front, right: 0 }
  }
  const front = Math.ceil(n * 0.55)
  const rest = n - front
  const back = Math.ceil(rest / 2)
  return { front, back, right: rest - back }
}

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

interface Stats {
  rise: number
  eff: number
  wallH: number
  slopeLen: number
  ridge: number
  eave: number
}

function shapeStats(d: ShelterDesign): Stats {
  const { width: W, height: H } = d
  if (d.type === 'rectangular') {
    const rise = (W / 2) * Math.tan(d.roofAngle * DEG)
    const eff = d.roofAngle
    return { rise, eff, wallH: H, slopeLen: eff > 0 ? W / 2 / Math.cos(eff * DEG) : W, ridge: H + rise, eave: H }
  }
  if (d.type === 'aframe') {
    let eff = clamp(d.roofAngle, 20, 80)
    let rise = (W / 2) * Math.tan(eff * DEG)
    if (rise > H) {
      eff = Math.atan(H / (W / 2)) / DEG
      rise = H
    }
    return { rise, eff, wallH: H - rise, slopeLen: W / 2 / Math.cos(eff * DEG), ridge: H, eave: H - rise }
  }
  return { rise: H, eff: 0, wallH: 0, slopeLen: 0, ridge: H, eave: 0 }
}

/** Half-ellipsoid dome surface area (Knud Thomsen approximation). */
function domeArea(a: number, b: number, c: number) {
  const p = 1.6075
  return (2 * Math.PI * (((a * b) ** p + (a * c) ** p + (b * c) ** p) / 3) ** (1 / p))
}

function layoutOpenings(d: ShelterDesign, st: Stats): { windows: Placement[]; door: Placement } {
  const { length: L, width: W, height: H } = d
  const tw = d.wallThickness / 1000
  const counts = faceCounts(d.type, d.windowCount)
  const windows: Placement[] = []
  let door: Placement

  if (d.type === 'rectangular') {
    const h = Math.min(d.windowHeight, H - 0.6)
    const sill = clamp(H - h - 0.3, 0.2, 0.9)
    const yc = sill + h / 2
    const groups: { face: Face; n: number; span: number }[] = [
      { face: 'front', n: counts.front, span: L - 2 * tw },
      { face: 'back', n: counts.back, span: L - 2 * tw },
      { face: 'right', n: counts.right, span: W },
    ]
    for (const g of groups) {
      const fit = fitSpan(g.n, g.span, d.windowWidth)
      fit.centers.forEach((c, i) => {
        const pos: Vec3 =
          g.face === 'front' ? [c, yc, W / 2] : g.face === 'back' ? [c, yc, -W / 2] : [L / 2, yc, c]
        const normal: Vec3 = g.face === 'front' ? [0, 0, 1] : g.face === 'back' ? [0, 0, -1] : [1, 0, 0]
        windows.push({ id: `w-${g.face}-${i}`, kind: 'window', host: 'wall', face: g.face, position: pos, normal, width: fit.w, height: h })
      })
    }
    const dh = Math.min(d.doorHeight, H - 0.15)
    const dw = Math.min(d.doorWidth, W - 0.6)
    door = { id: 'door', kind: 'door', host: 'wall', face: 'left', position: [-L / 2, dh / 2, 0], normal: [-1, 0, 0], width: dw, height: dh }
    return { windows, door }
  }

  if (d.type === 'aframe') {
    const th = st.eff * DEG
    const groups: { face: Face; n: number }[] = [
      { face: 'front', n: counts.front },
      { face: 'back', n: counts.back },
    ]
    const h = clamp(Math.min(d.windowHeight, st.slopeLen - 0.5), 0.3, d.windowHeight)
    const vc = clamp(st.slopeLen * 0.5, h / 2 + 0.2, Math.max(h / 2 + 0.2, st.slopeLen - h / 2 - 0.2))
    for (const g of groups) {
      const fit = fitSpan(g.n, L - 2 * tw, d.windowWidth)
      const sgn = g.face === 'front' ? 1 : -1
      fit.centers.forEach((c, i) => {
        const y = st.wallH + vc * Math.sin(th)
        const z = sgn * (W / 2 - vc * Math.cos(th))
        windows.push({
          id: `w-${g.face}-${i}`, kind: 'window', host: 'roof', face: g.face,
          position: [c, y, z], normal: [0, Math.cos(th), sgn * Math.sin(th)], width: fit.w, height: h,
        })
      })
    }
    // Door on the left gable; keep the leaf inside the gable outline.
    let dw = Math.min(d.doorWidth, W - 0.4)
    let dh = Math.min(d.doorHeight, st.ridge - 0.3)
    const maxH = (w: number) => st.wallH + Math.tan(th) * (W / 2 - w / 2) - 0.08
    dh = Math.min(dh, maxH(dw))
    if (dh < 1.5) {
      dh = Math.min(d.doorHeight, 1.5)
      dw = Math.max(0.5, Math.min(dw, 2 * (W / 2 - (dh + 0.08 - st.wallH) / Math.tan(th))))
    }
    dh = Math.max(dh, 1)
    door = { id: 'door', kind: 'door', host: 'wall', face: 'left', position: [-L / 2, dh / 2, 0], normal: [-1, 0, 0], width: dw, height: dh }
    return { windows, door }
  }

  // Dome — half-ellipsoid with semi-axes a (x), c (y), b (z)
  const a = L / 2
  const b = W / 2
  const c = H
  const hmax = Math.max(0.3, 0.8 * c - 0.4)
  const h = Math.min(d.windowHeight, hmax)
  const yc = 0.4 + h / 2
  const s = Math.sqrt(Math.max(0.05, 1 - (yc / c) ** 2))
  const rAvg = ((a + b) / 2) * s
  const onDome = (psi: number, y: number): { pos: Vec3; normal: Vec3 } => {
    const sc = Math.sqrt(Math.max(0.02, 1 - (y / c) ** 2))
    const x = a * sc * Math.sin(psi)
    const z = b * sc * Math.cos(psi)
    return { pos: [x, y, z], normal: norm([x / (a * a), y / (c * c), z / (b * b)]) }
  }
  const groups: { face: Face; n: number; psi0: number }[] = [
    { face: 'front', n: counts.front, psi0: 0 },
    { face: 'back', n: counts.back, psi0: Math.PI },
    { face: 'right', n: counts.right, psi0: Math.PI / 2 },
  ]
  for (const g of groups) {
    let n = g.n
    const w = Math.min(d.windowWidth, rAvg * 0.9)
    const step = Math.max(0.2, (w * 1.35) / rAvg)
    while (n > 1 && (n - 1) * step > 1.8) n--
    for (let i = 0; i < n; i++) {
      const psi = g.psi0 + (i - (n - 1) / 2) * step
      const p = onDome(psi, yc)
      windows.push({ id: `w-${g.face}-${i}`, kind: 'window', host: 'wall', face: g.face, position: p.pos, normal: p.normal, width: w, height: h })
    }
  }
  const dh = Math.min(d.doorHeight, 0.8 * c)
  const dw = Math.min(d.doorWidth, b * 0.9)
  const dp = onDome(-Math.PI / 2, dh / 2)
  door = { id: 'door', kind: 'door', host: 'wall', face: 'left', position: dp.pos, normal: dp.normal, width: dw, height: dh }
  return { windows, door }
}

/* -------------------------------------------------------------------------- */
/*  Derived geometry: areas, volume, surfaces                                 */
/* -------------------------------------------------------------------------- */

export function deriveGeometry(input: ShelterDesign): DerivedGeometry {
  const d = sanitizeDesign(input)
  const { length: L, width: W, height: H } = d
  const st = shapeStats(d)
  const th = st.eff * DEG
  const { windows, door } = layoutOpenings(d, st)
  const windowArea = windows.reduce((s, w) => s + w.width * w.height, 0)
  const doorArea = door.width * door.height

  let floorArea = L * W
  let volume = 0
  let grossWall = 0
  let grossRoof = 0
  const surfaces: SurfaceDef[] = []
  const add = (component: SurfaceDef['component'], face: string, area: number, normal: Vec3) =>
    surfaces.push({ id: `${component}-${face}`, component, face, area, normal })

  if (d.type === 'rectangular') {
    const endArea = W * H + 0.5 * W * st.rise
    volume = L * W * H + 0.5 * L * W * st.rise
    add('wall', 'front', L * H, [0, 0, 1])
    add('wall', 'back', L * H, [0, 0, -1])
    add('wall', 'left', endArea, [-1, 0, 0])
    add('wall', 'right', endArea, [1, 0, 0])
    grossWall = 2 * L * H + 2 * endArea
    if (d.roofAngle <= 0) {
      grossRoof = L * W
      add('roof', 'top', grossRoof, [0, 1, 0])
    } else {
      const a = L * st.slopeLen
      grossRoof = 2 * a
      add('roof', 'front', a, [0, Math.cos(th), Math.sin(th)])
      add('roof', 'back', a, [0, Math.cos(th), -Math.sin(th)])
    }
  } else if (d.type === 'aframe') {
    const endArea = W * st.wallH + 0.5 * W * st.rise
    volume = L * (W * st.wallH + 0.5 * W * st.rise)
    if (st.wallH > 0.02) {
      add('wall', 'front', L * st.wallH, [0, 0, 1])
      add('wall', 'back', L * st.wallH, [0, 0, -1])
    }
    add('wall', 'left', endArea, [-1, 0, 0])
    add('wall', 'right', endArea, [1, 0, 0])
    grossWall = 2 * endArea + (st.wallH > 0.02 ? 2 * L * st.wallH : 0)
    const a = L * st.slopeLen
    grossRoof = 2 * a
    add('roof', 'front', a, [0, Math.cos(th), Math.sin(th)])
    add('roof', 'back', a, [0, Math.cos(th), -Math.sin(th)])
  } else {
    const a = L / 2
    const b = W / 2
    floorArea = Math.PI * a * b
    volume = (2 / 3) * Math.PI * a * b * H
    const shell = domeArea(a, b, H)
    grossWall = shell * 0.5
    grossRoof = shell * 0.5
    for (let k = 0; k < 8; k++) {
      const psi = k * 45 * DEG
      const tw = 15 * DEG
      add('wall', `s${k}`, grossWall / 8, [Math.sin(psi) * Math.cos(tw), Math.sin(tw), Math.cos(psi) * Math.cos(tw)])
      const tr = 50 * DEG
      add('roof', `s${k}`, (grossRoof * 0.75) / 8, [Math.sin(psi) * Math.cos(tr), Math.sin(tr), Math.cos(psi) * Math.cos(tr)])
    }
    add('roof', 'top', grossRoof * 0.25, [0, 1, 0])
  }
  add('floor', 'all', floorArea, [0, -1, 0])

  // Subtract openings from the surface they sit on (or proportionally if no match).
  const carve = (p: Placement) => {
    const area = p.width * p.height
    const target = surfaces.find((s) => s.component === p.host && s.face === p.face)
    if (target) {
      target.area = Math.max(target.area - area, target.area * 0.15)
    } else {
      const hosts = surfaces.filter((s) => s.component === p.host)
      const total = hosts.reduce((s, h) => s + h.area, 0)
      hosts.forEach((h) => (h.area = Math.max(h.area - (area * h.area) / total, h.area * 0.15)))
    }
  }
  windows.forEach(carve)
  carve(door)

  const netWall = surfaces.filter((s) => s.component === 'wall').reduce((s, x) => s + x.area, 0)
  const netRoof = surfaces.filter((s) => s.component === 'roof').reduce((s, x) => s + x.area, 0)
  const envelopeArea = netWall + netRoof + floorArea + windowArea + doorArea

  return {
    design: d,
    floorArea,
    volume,
    ridgeHeight: st.ridge,
    eaveHeight: st.eave,
    roofAngleEff: st.eff,
    rise: st.rise,
    wallHeight: st.wallH,
    slopeLength: st.slopeLen,
    grossWall,
    grossRoof,
    netWall,
    netRoof,
    windowArea,
    doorArea,
    windows,
    door,
    surfaces,
    envelopeArea,
    surfaceToVolume: envelopeArea / Math.max(volume, 0.1),
    wwr: windowArea / Math.max(grossWall + (d.type === 'aframe' ? grossRoof : 0), 0.1),
    windowsFitted: windows.length,
  }
}

/** Rotate a shelter-local vector into world space (about Y) for the given orientation bearing. */
export function localToWorld(v: Vec3, orientation: number): Vec3 {
  const phi = (180 - orientation) * DEG
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
}

/** Cross-field validation used by the editor for inline errors/warnings. */
export interface DesignIssue {
  field: NumericKey | 'general'
  level: 'error' | 'warn'
  message: string
}

export function validateDesign(d: ShelterDesign): DesignIssue[] {
  const issues: DesignIssue[] = []
  const geo = deriveGeometry(d)
  const st = shapeStats(sanitizeDesign(d))
  const eave = d.type === 'aframe' ? st.eave : d.height
  if (d.type === 'rectangular' && d.doorHeight > d.height - 0.15)
    issues.push({ field: 'doorHeight', level: 'error', message: `Door (${d.doorHeight.toFixed(2)} m) is taller than the eave height (${d.height.toFixed(1)} m).` })
  if (d.doorWidth > d.width - 0.6 && d.type !== 'dome')
    issues.push({ field: 'doorWidth', level: 'error', message: 'Door is too wide for the end wall.' })
  if (d.type === 'rectangular' && d.windowHeight > d.height - 0.6)
    issues.push({ field: 'windowHeight', level: 'error', message: 'Window height exceeds the available wall height.' })
  if (d.windowCount > 0 && geo.windowsFitted < d.windowCount)
    issues.push({ field: 'windowCount', level: 'warn', message: `Only ${geo.windowsFitted} of ${d.windowCount} windows fit on the available facades.` })
  if (geo.wwr > 0.4)
    issues.push({ field: 'windowCount', level: 'warn', message: `Glazing is ${(geo.wwr * 100).toFixed(0)}% of the wall area — expect high heat loss at night.` })
  if (d.type === 'aframe' && d.roofAngle > 0) {
    const need = Math.atan(d.height / (d.width / 2)) / DEG
    if (d.roofAngle > need + 0.5)
      issues.push({ field: 'roofAngle', level: 'warn', message: `Roof pitch limited to ${need.toFixed(0)}° by width and height.` })
  }
  if (d.type === 'aframe' && eave < 0)
    issues.push({ field: 'height', level: 'error', message: 'Invalid A-frame proportions.' })
  if (geo.floorArea < 6)
    issues.push({ field: 'general', level: 'warn', message: `Floor area is only ${geo.floorArea.toFixed(1)} m² — cramped for two occupants.` })
  return issues
}
