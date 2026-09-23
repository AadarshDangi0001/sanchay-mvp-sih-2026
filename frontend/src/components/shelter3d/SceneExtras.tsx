import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { DerivedGeometry, Vec3 } from '../../types/shelter'
import { DEG } from '../../utils/geometry'
import { sunPosition } from '../../utils/thermal'
import { Label3D } from './Label'

export type CameraPreset = 'iso' | 'front' | 'side' | 'top'

/* ------------------------------------------------------------------ compass */

export function Compass({ radius }: { radius: number }) {
  const ticks = useMemo(() => {
    const pts: number[] = []
    for (let a = 0; a < 360; a += 15) {
      const len = a % 90 === 0 ? 0.55 : a % 45 === 0 ? 0.35 : 0.18
      const r0 = radius
      const r1 = radius + len
      const x = Math.sin(a * DEG)
      const z = -Math.cos(a * DEG)
      pts.push(x * r0, 0.01, z * r0, x * r1, 0.01, z * r1)
    }
    return new Float32Array(pts)
  }, [radius])
  const labels: [string, number, number, boolean][] = [
    ['N', 0, -1, true], ['E', 1, 0, false], ['S', 0, 1, false], ['W', -1, 0, false],
  ]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.008}>
        <ringGeometry args={[radius - 0.02, radius + 0.02, 128]} />
        <meshBasicMaterial color="#2f6fe8" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ticks, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#2f6fe8" transparent opacity={0.6} />
      </lineSegments>
      {labels.map(([t, x, z, north]) => (
        <Label3D key={t} text={t} position={[x * (radius + 1.05), 0.05, z * (radius + 1.05)]} color={north ? '#ef4444' : '#1a44b0'} bold height={18} />
      ))}
    </group>
  )
}

/* --------------------------------------------------------------- dimensions */

function DimLine({ a, b, label, tick }: { a: Vec3; b: Vec3; label: string; tick: Vec3 }) {
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const t = (p: Vec3, s: number): Vec3 => [p[0] + tick[0] * s, p[1] + tick[1] * s, p[2] + tick[2] * s]
  return (
    <group>
      <Line points={[a, b]} color="#1d55d6" lineWidth={1.4} />
      <Line points={[t(a, -0.12), t(a, 0.12)]} color="#1d55d6" lineWidth={1.4} />
      <Line points={[t(b, -0.12), t(b, 0.12)]} color="#1d55d6" lineWidth={1.4} />
      <Label3D text={label} position={mid} color="#1a44b0" bg="rgba(255,255,255,0.95)" border="#bcd4ff" height={17} />
    </group>
  )
}

export function Dimensions({ geo }: { geo: DerivedGeometry }) {
  const { length: L, width: W } = geo.design
  const H = geo.ridgeHeight
  const off = 0.7
  return (
    <group>
      <DimLine a={[-L / 2, 0.02, W / 2 + off]} b={[L / 2, 0.02, W / 2 + off]} label={`L ${L.toFixed(1)} m`} tick={[0, 0, 1]} />
      <DimLine a={[L / 2 + off, 0.02, -W / 2]} b={[L / 2 + off, 0.02, W / 2]} label={`W ${W.toFixed(1)} m`} tick={[1, 0, 0]} />
      <DimLine a={[-L / 2 - 0.35, 0, W / 2 + off]} b={[-L / 2 - 0.35, H, W / 2 + off]} label={`H ${H.toFixed(1)} m`} tick={[1, 0, 0]} />
    </group>
  )
}

/* ---------------------------------------------------------------- sun + sky */

export function SunRig({
  latitude, dayOfYear, hour, radius, shadows, showPath, span,
}: { latitude: number; dayOfYear: number; hour: number; radius: number; shadows: boolean; showPath: boolean; span: number }) {
  const sun = sunPosition(latitude, dayOfYear, hour)
  const up = sun.altitude > 0.02
  const dir = new THREE.Vector3(...sun.dir)
  const pos = dir.clone().multiplyScalar(radius)
  const path = useMemo(() => {
    const pts: Vec3[] = []
    for (let h = 3; h <= 21; h += 0.25) {
      const s = sunPosition(latitude, dayOfYear, h)
      if (s.altitude > 0.005) pts.push([s.dir[0] * radius, s.dir[1] * radius, s.dir[2] * radius])
    }
    return pts
  }, [latitude, dayOfYear, radius])
  const marks = useMemo(() => {
    const out: { h: number; p: Vec3 }[] = []
    for (let h = 6; h <= 18; h += 2) {
      const s = sunPosition(latitude, dayOfYear, h)
      if (s.altitude > 0.03) out.push({ h, p: [s.dir[0] * radius, s.dir[1] * radius, s.dir[2] * radius] })
    }
    return out
  }, [latitude, dayOfYear, radius])
  const lightPos: Vec3 = up ? [pos.x, pos.y, pos.z] : [radius * 0.3, radius * 0.8, radius * 0.4]

  return (
    <>
      <directionalLight
        position={lightPos}
        intensity={up ? 0.35 + Math.min(1, sun.altitude * 2.2) * 2.1 : 0.25}
        color={up ? '#fff4e0' : '#9db4ff'}
        castShadow={shadows && up}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={1}
        shadow-camera-far={radius * 3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {showPath && path.length > 1 && (
        <>
          <Line points={path} color="#f0a500" lineWidth={1.4} dashed dashSize={0.5} gapSize={0.35} transparent opacity={0.9} />
          {marks.map((m) => (
            <group key={m.h} position={m.p}>
              <mesh>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshBasicMaterial color="#f0a500" />
              </mesh>
              <Label3D text={`${String(m.h).padStart(2, '0')}h`} position={[0, 0.5, 0]} color="#b45309" height={16} />
            </group>
          ))}
        </>
      )}
      {up && showPath && (
        <mesh position={pos}>
          <sphereGeometry args={[0.55, 24, 16]} />
          <meshBasicMaterial color="#ffb703" />
        </mesh>
      )}
    </>
  )
}

/* ------------------------------------------------------------------- camera */

export function cameraGoal(preset: CameraPreset, radius: number, bearing: number, target: THREE.Vector3) {
  const at = (deg: number, dist: number, y: number) => {
    const b = (bearing + deg) * DEG
    return new THREE.Vector3(target.x + Math.sin(b) * dist, y, target.z - Math.cos(b) * dist)
  }
  switch (preset) {
    case 'front': return at(0, radius * 2.9, target.y + radius * 0.15)
    case 'side': return at(90, radius * 2.9, target.y + radius * 0.15)
    case 'top': return new THREE.Vector3(target.x + 0.001, target.y + radius * 3, target.z + 0.001)
    default: return at(38, radius * 2.45, target.y + radius * 0.95)
  }
}

export function CameraRig({
  preset, nonce, radius, bearing, target,
}: { preset: CameraPreset | null; nonce: number; radius: number; bearing: number; target: [number, number, number] }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const fitted = useRef(false)
  // Narrow viewports need to sit further back to keep the whole shelter in frame.
  const fit = Math.min(2.2, Math.max(1, 1.4 / (size.width / Math.max(size.height, 1))))

  useEffect(() => {
    if (fitted.current || !controls || size.width < 10) return
    fitted.current = true
    const t = new THREE.Vector3(...target)
    camera.position.copy(cameraGoal('iso', radius * fit, bearing, t))
    controls.target.copy(t)
    controls.update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, size.width])

  useEffect(() => {
    if (!preset) return
    const t = new THREE.Vector3(...target)
    goal.current = { pos: cameraGoal(preset, radius * fit, bearing, t), target: t }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, nonce])

  useFrame((_, dt) => {
    const g = goal.current
    if (!g || !controls) return
    const k = 1 - Math.exp(-dt * 6)
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.target, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.03) goal.current = null
  })
  return null
}

/* Shared state so two viewers (What-If) can follow one another's camera. */
const shared = { pos: new THREE.Vector3(), target: new THREE.Vector3(), driver: '' as string, valid: false }

export function CameraSync({ id }: { id: string }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as
    | (THREE.EventDispatcher<{ start: object; change: object; end: object }> & { target: THREE.Vector3; update: () => void })
    | null

  useEffect(() => {
    if (!controls) return
    const onStart = () => { shared.driver = id }
    const onChange = () => {
      if (shared.driver !== id) return
      shared.pos.copy(camera.position)
      shared.target.copy(controls.target)
      shared.valid = true
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('change', onChange)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('change', onChange)
    }
  }, [controls, camera, id])

  useFrame(() => {
    if (!controls || !shared.valid || shared.driver === id || shared.driver === '') return
    camera.position.copy(shared.pos)
    controls.target.copy(shared.target)
    controls.update()
  })
  return null
}

/* ----------------------------------------------------------------- snapshot */

export function SnapshotCapture({ onCapture }: { onCapture: (url: string) => void }) {
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    if (++frames.current > 12) {
      done.current = true
      try {
        onCapture(gl.domElement.toDataURL('image/png'))
      } catch {
        /* canvas not readable — leave the live canvas in place */
      }
    }
  })
  return null
}
