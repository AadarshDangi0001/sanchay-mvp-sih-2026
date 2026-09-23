import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { DerivedGeometry, SurfaceDef, Vec3 } from '../../types/shelter'
import type { HourlyResult } from '../../types/simulation'
import { DEG } from '../../utils/geometry'
import { mulberry32 } from '../../utils/optimization'

const COUNT = 150

interface Origin {
  pos: Vec3
  n: Vec3
  weight: number
}

function samplePoint(geo: DerivedGeometry, s: SurfaceDef, r1: number, r2: number): { pos: Vec3; n: Vec3 } {
  const d = geo.design
  const { length: L, width: W, height: H } = d
  const th = geo.roofAngleEff * DEG
  if (d.type === 'dome') {
    const a = L / 2, b = W / 2, c = H
    const psi = Math.atan2(s.normal[0], s.normal[2]) + (r1 - 0.5) * 0.75
    const y = s.component === 'wall' ? 0.5 * c * r2 : 0.5 * c + 0.5 * c * r2 * (s.face === 'top' ? 1 : 0.7)
    const k = Math.sqrt(Math.max(0.03, 1 - (y / c) ** 2))
    const x = a * k * Math.sin(psi)
    const z = b * k * Math.cos(psi)
    const l = Math.hypot(x / (a * a), y / (c * c), z / (b * b)) || 1
    return { pos: [x, y, z], n: [x / (a * a) / l, y / (c * c) / l, z / (b * b) / l] }
  }
  const eave = d.type === 'aframe' ? geo.wallHeight : H
  const u = (r1 - 0.5)
  if (s.component === 'roof') {
    if (s.face === 'top') return { pos: [u * (L - 0.4), H, (r2 - 0.5) * (W - 0.4)], n: [0, 1, 0] }
    const sg = s.face === 'front' ? 1 : -1
    const along = r2 * geo.slopeLength
    return {
      pos: [u * (L - 0.4), eave + along * Math.sin(th), sg * (W / 2 - along * Math.cos(th))],
      n: [0, Math.cos(th), sg * Math.sin(th)],
    }
  }
  switch (s.face) {
    case 'front': return { pos: [u * (L - 0.4), r2 * eave, W / 2], n: [0, 0, 1] }
    case 'back': return { pos: [u * (L - 0.4), r2 * eave, -W / 2], n: [0, 0, -1] }
    case 'left':
    case 'right': {
      const zz = u * (W - 0.3)
      const top = eave + geo.rise * (1 - Math.abs(zz) / (W / 2))
      return { pos: [s.face === 'left' ? -L / 2 : L / 2, r2 * top, zz], n: [s.face === 'left' ? -1 : 1, 0, 0] }
    }
  }
  return { pos: [0, 0, 0], n: [0, 1, 0] }
}

/** Warm particles drifting out of the shelter, emitted in proportion to each surface's conductive loss. */
export function HeatFlow({ geo, row }: { geo: DerivedGeometry; row: HourlyResult }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const rng = useMemo(() => mulberry32(7), [])
  const origins = useRef<Origin[]>([])
  const cumulative = useRef<number[]>([])

  useMemo(() => {
    const list: Origin[] = []
    const rand = mulberry32(11)
    const flux = row.surfaceFlux
    const push = (pos: Vec3, n: Vec3, w: number) => list.push({ pos, n, weight: Math.max(0, w) })
    for (const s of geo.surfaces) {
      if (s.component === 'floor') continue
      const f = s.component === 'wall' ? flux.walls : flux.roof
      for (let i = 0; i < 6; i++) {
        const p = samplePoint(geo, s, rand(), rand())
        push(p.pos, p.n, (f * s.area) / 6)
      }
    }
    for (const w of geo.windows) push(w.position, w.normal, flux.windows * w.width * w.height)
    push(geo.door.position, geo.door.normal, flux.door * geo.door.width * geo.door.height)
    origins.current = list
    let acc = 0
    cumulative.current = list.map((o) => (acc += o.weight))
  }, [geo, row])

  const state = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => ({ t: i / COUNT, speed: 0.22 + rng() * 0.22, o: 0, jitter: [rng() - 0.5, rng() - 0.5, rng() - 0.5] as Vec3 })),
    [rng],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const pickOrigin = () => {
    const c = cumulative.current
    const total = c[c.length - 1] || 0
    if (total <= 0) return 0
    const r = rng() * total
    let lo = 0
    let hi = c.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (c[mid] < r) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    const os = origins.current
    state.forEach((p, i) => {
      p.t += dt * p.speed
      if (p.t >= 1 || !os[p.o]) {
        p.t = p.t >= 1 ? 0 : p.t
        p.o = pickOrigin()
      }
      const o = os[p.o]
      if (!o) return
      const dist = p.t * 1.8
      dummy.position.set(o.pos[0] + o.n[0] * dist + p.jitter[0] * 0.15 * p.t, o.pos[1] + o.n[1] * dist + p.jitter[1] * 0.15 * p.t, o.pos[2] + o.n[2] * dist + p.jitter[2] * 0.15 * p.t)
      const s = Math.sin(p.t * Math.PI) * 0.075
      dummy.scale.setScalar(Math.max(s, 0.0001))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="#ff5a1f" transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  )
}
