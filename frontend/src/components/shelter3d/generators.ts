import * as THREE from 'three'
import type { DerivedGeometry, Placement, Vec3 } from '../../types/shelter'
import { DEG } from '../../utils/geometry'

export type PartComponent = 'wall' | 'roof' | 'floor' | 'mass'

export interface Part {
  key: string
  component: PartComponent
  geometry: THREE.BufferGeometry
  position: Vec3
  rotation: Vec3
  order: THREE.EulerOrder
}

export interface ShelterBuild {
  parts: Part[]
}

interface Hole {
  u: number
  v: number
  w: number
  h: number
}

/**
 * A flat panel whose outer face lies in the local XY plane facing +Z and extends `depth` back along −Z.
 * Openings are cut through it as real holes.
 */
function panel(poly: [number, number][], holes: Hole[], depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)))
  const xs = poly.map((p) => p[0])
  const ys = poly.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs) + 0.03, Math.max(...xs) - 0.03, Math.min(...ys) + 0.03, Math.max(...ys) - 0.03]
  for (const h of holes) {
    const l = Math.max(h.u - h.w / 2, x0)
    const r = Math.min(h.u + h.w / 2, x1)
    const b = Math.max(h.v - h.h / 2, y0)
    const t = Math.min(h.v + h.h / 2, y1)
    if (r - l < 0.1 || t - b < 0.1) continue
    const p = new THREE.Path()
    p.moveTo(l, b)
    p.lineTo(r, b)
    p.lineTo(r, t)
    p.lineTo(l, t)
    p.closePath()
    shape.holes.push(p)
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(depth, 0.02), bevelEnabled: false })
  g.translate(0, 0, -Math.max(depth, 0.02))
  return g
}

const rectPoly = (x0: number, x1: number, y0: number, y1: number): [number, number][] => [
  [x0, y0], [x1, y0], [x1, y1], [x0, y1],
]

const part = (
  key: string,
  component: PartComponent,
  geometry: THREE.BufferGeometry,
  position: Vec3 = [0, 0, 0],
  rotation: Vec3 = [0, 0, 0],
  order: THREE.EulerOrder = 'XYZ',
): Part => ({ key, component, geometry, position, rotation, order })

function floorParts(geo: DerivedGeometry): Part[] {
  const d = geo.design
  const tf = Math.max(d.floorThickness / 1000, 0.05)
  const tm = d.massThickness / 1000
  const out: Part[] = []
  if (d.type === 'dome') {
    const a = d.length / 2
    const b = d.width / 2
    const f = new THREE.CylinderGeometry(1, 1, tf, 72)
    f.scale(a, 1, b)
    out.push(part('floor', 'floor', f, [0, -tf / 2, 0]))
    if (tm > 0) {
      const m = new THREE.CylinderGeometry(1, 1, tm, 72)
      m.scale(a - 0.15, 1, b - 0.15)
      out.push(part('mass', 'mass', m, [0, tm / 2, 0]))
    }
    return out
  }
  out.push(part('floor', 'floor', new THREE.BoxGeometry(d.length, tf, d.width), [0, -tf / 2, 0]))
  if (tm > 0) {
    const tw = d.wallThickness / 1000
    out.push(part('mass', 'mass', new THREE.BoxGeometry(d.length - 2 * tw, tm, d.width - 2 * tw), [0, tm / 2, 0]))
  }
  return out
}

const holesFor = (
  placements: Placement[],
  face: string,
  uv: (p: Placement) => [number, number],
): Hole[] =>
  placements
    .filter((p) => p.face === face)
    .map((p) => {
      const [u, v] = uv(p)
      return { u, v, w: p.width + 0.04, h: p.height + 0.04 }
    })

/** Rectangular shelter: four vertical walls, flat or gabled roof. */
export function buildRectangular(geo: DerivedGeometry): ShelterBuild {
  const d = geo.design
  const { length: L, width: W, height: H } = d
  const tw = Math.max(d.wallThickness / 1000, 0.03)
  const tr = Math.max(d.roofThickness / 1000, 0.03)
  const th = d.roofAngle * DEG
  const rise = geo.rise
  const parts: Part[] = [...floorParts(geo)]
  const win = geo.windows

  parts.push(
    part('wall-front', 'wall', panel(rectPoly(-(L / 2 - tw), L / 2 - tw, 0, H), holesFor(win, 'front', (p) => [p.position[0], p.position[1]]), tw), [0, 0, W / 2]),
    part('wall-back', 'wall', panel(rectPoly(-(L / 2 - tw), L / 2 - tw, 0, H), holesFor(win, 'back', (p) => [-p.position[0], p.position[1]]), tw), [0, 0, -W / 2], [0, Math.PI, 0]),
  )
  const gable: [number, number][] =
    rise > 0.01 ? [[-W / 2, 0], [W / 2, 0], [W / 2, H], [0, H + rise], [-W / 2, H]] : rectPoly(-W / 2, W / 2, 0, H)
  const door = geo.door
  parts.push(
    part('wall-left', 'wall', panel(gable, [{ u: door.position[2], v: door.position[1], w: door.width + 0.04, h: door.height + 0.03 }], tw), [-L / 2, 0, 0], [0, -Math.PI / 2, 0]),
    part('wall-right', 'wall', panel(gable, holesFor(win, 'right', (p) => [-p.position[2], p.position[1]]), tw), [L / 2, 0, 0], [0, Math.PI / 2, 0]),
  )

  if (d.roofAngle <= 0) {
    const o = 0.18
    parts.push(part('roof', 'roof', new THREE.BoxGeometry(L + 2 * o, tr, W + 2 * o), [0, H + tr / 2, 0]))
  } else {
    const o = 0.2
    const yE = H + tr / Math.cos(th) - o * Math.tan(th)
    const s = (W / 2 + o) / Math.cos(th)
    const poly = rectPoly(-(L / 2 + o), L / 2 + o, 0, s)
    parts.push(
      part('roof-front', 'roof', panel(poly, [], tr), [0, yE, W / 2 + o], [th - Math.PI / 2, 0, 0]),
      part('roof-back', 'roof', panel(poly, [], tr), [0, yE, -(W / 2 + o)], [th - Math.PI / 2, Math.PI, 0], 'YXZ'),
    )
  }
  return { parts }
}

/** A-frame: two steep roof planes (optionally on short knee walls) and glazed / door gables. */
export function buildAFrame(geo: DerivedGeometry): ShelterBuild {
  const d = geo.design
  const { length: L, width: W, height: H } = d
  const tw = Math.max(d.wallThickness / 1000, 0.03)
  const tr = Math.max(d.roofThickness / 1000, 0.03)
  const th = geo.roofAngleEff * DEG
  const wallH = geo.wallHeight
  const parts: Part[] = [...floorParts(geo)]

  const slope = rectPoly(-L / 2, L / 2, 0, geo.slopeLength)
  const vOf = (p: Placement) => (p.position[1] - wallH) / Math.sin(th)
  parts.push(
    part('roof-front', 'roof', panel(slope, holesFor(geo.windows, 'front', (p) => [p.position[0], vOf(p)]), tr), [0, wallH, W / 2], [th - Math.PI / 2, 0, 0]),
    part('roof-back', 'roof', panel(slope, holesFor(geo.windows, 'back', (p) => [-p.position[0], vOf(p)]), tr), [0, wallH, -W / 2], [th - Math.PI / 2, Math.PI, 0], 'YXZ'),
  )
  if (wallH > 0.02) {
    parts.push(
      part('knee-front', 'wall', panel(rectPoly(-L / 2, L / 2, 0, wallH), [], tw), [0, 0, W / 2]),
      part('knee-back', 'wall', panel(rectPoly(-L / 2, L / 2, 0, wallH), [], tw), [0, 0, -W / 2], [0, Math.PI, 0]),
    )
  }
  // Gable outline follows the inner face of the roof planes.
  const tri = tr / Math.cos(th)
  const yEave = wallH - tri
  const yApex = H - tri
  const gable: [number, number][] =
    yEave >= 0.01
      ? [[-W / 2, 0], [W / 2, 0], [W / 2, yEave], [0, yApex], [-W / 2, yEave]]
      : (() => {
          const hb = Math.min(W / 2, yApex / Math.tan(th))
          return [[-hb, 0], [hb, 0], [0, yApex]] as [number, number][]
        })()
  const door = geo.door
  parts.push(
    part('gable-left', 'wall', panel(gable, [{ u: door.position[2], v: door.position[1], w: door.width + 0.04, h: door.height + 0.03 }], tw), [-L / 2, 0, 0], [0, -Math.PI / 2, 0]),
    part('gable-right', 'wall', panel(gable, [], tw), [L / 2, 0, 0], [0, Math.PI / 2, 0]),
  )
  return { parts }
}

/** Dome: half-ellipsoid shell split into a wall band and a roof cap. */
export function buildDome(geo: DerivedGeometry): ShelterBuild {
  const d = geo.design
  const a = d.length / 2
  const b = d.width / 2
  const c = d.height
  const parts: Part[] = [...floorParts(geo)]
  const roof = new THREE.SphereGeometry(1, 72, 20, 0, Math.PI * 2, 0, Math.PI / 3)
  roof.scale(a, c, b)
  const wall = new THREE.SphereGeometry(1, 72, 12, 0, Math.PI * 2, Math.PI / 3, Math.PI / 6)
  wall.scale(a, c, b)
  parts.push(part('dome-roof', 'roof', roof), part('dome-wall', 'wall', wall))
  return { parts }
}

/** Shelter-local orientation so a flat opening faces `normal` with its local Y kept as "up". */
export function quatFromNormal(n: Vec3): THREE.Quaternion {
  const z = new THREE.Vector3(...n).normalize()
  const up = Math.abs(z.y) > 0.98 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
  const x = up.clone().cross(z).normalize()
  const y = z.clone().cross(x)
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
}

export function disposeBuild(build: ShelterBuild) {
  build.parts.forEach((p) => p.geometry.dispose())
}
