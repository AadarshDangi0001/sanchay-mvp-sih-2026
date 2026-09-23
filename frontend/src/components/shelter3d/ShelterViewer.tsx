import { Suspense, useMemo, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei'
import type { ShelterDesign } from '../../types/shelter'
import { DEG, deriveGeometry } from '../../utils/geometry'
import { Shelter3D } from './Shelter3D'
import {
  CameraRig, CameraSync, Compass, Dimensions, SnapshotCapture, SunRig, cameraGoal, type CameraPreset,
} from './SceneExtras'
import type { ThermalView } from './ThermalHeatmap'

export interface ShelterViewerProps {
  design: ShelterDesign
  thermal?: ThermalView
  /** clock hour driving the sun position / shadows */
  hour?: number
  latitude?: number
  dayOfYear?: number
  showGrid?: boolean
  showDims?: boolean
  showSunPath?: boolean
  showCompass?: boolean
  autoRotate?: boolean
  /** section-cut z position (world), null = off */
  section?: number | null
  cameraPreset?: CameraPreset | null
  presetNonce?: number
  syncId?: string
  shadows?: boolean
  quality?: 'high' | 'low'
  className?: string
  /** small caption in the top-left corner */
  caption?: ReactNode
  /** DOM overlay children (legends, toolbars) */
  children?: ReactNode
  /** extra R3F children rendered inside the canvas */
  scene?: ReactNode
  preserveBuffer?: boolean
  onCapture?: (dataUrl: string) => void
  interactive?: boolean
}

export function ShelterViewer({
  design, thermal, hour = 13, latitude = 34.15, dayOfYear = 15, showGrid = true, showDims = false,
  showSunPath = true, showCompass = true, autoRotate = false, section = null, cameraPreset = null, presetNonce = 0,
  syncId, shadows = true, quality = 'high', className = '', caption, children, scene, preserveBuffer, onCapture,
  interactive = true,
}: ShelterViewerProps) {
  const geo = useMemo(() => deriveGeometry(design), [design])
  const [initial] = useState(() => {
    const g = deriveGeometry(design)
    const r0 = Math.max(g.design.length, g.design.width, g.ridgeHeight * 1.6) * 0.9
    const p = cameraGoal('iso', r0, g.design.orientation, new THREE.Vector3(0, g.ridgeHeight * 0.4, 0))
    return p.toArray() as [number, number, number]
  })
  const radius = Math.max(geo.design.length, geo.design.width, geo.ridgeHeight * 1.6) * 0.9
  const target: [number, number, number] = [0, geo.ridgeHeight * 0.4, 0]
  const compassR = Math.max(geo.design.length, geo.design.width) * 0.75 + 1.6
  const sunR = compassR + 9

  return (
    <div className={`crop relative overflow-hidden rounded-2xl border border-line bg-[#eaf1fa] ${className}`}>
      <Canvas
        shadows={shadows && quality === 'high' ? 'percentage' : false}
        dpr={quality === 'high' ? [1, 1.75] : 1}
        camera={{ position: initial, fov: 36, near: 0.1, far: 300 }}
        gl={{ antialias: quality === 'high', localClippingEnabled: true, preserveDrawingBuffer: !!preserveBuffer }}
        flat
      >
        <color attach="background" args={['#eaf1fa']} />
        <fog attach="fog" args={['#eaf1fa', 32, 78]} />
        <hemisphereLight args={['#ffffff', '#aebfd8', 0.85]} />
        <SunRig
          latitude={latitude} dayOfYear={dayOfYear} hour={hour} radius={sunR}
          shadows={shadows && quality === 'high'} showPath={showSunPath} span={compassR + 3}
        />
        {quality === 'high' && (
          <Environment resolution={64} frames={1} environmentIntensity={0.55}>
            <Lightformer form="rect" intensity={2.2} position={[0, 6, -6]} scale={[14, 4, 1]} />
            <Lightformer form="rect" intensity={1.2} position={[-6, 3, 4]} scale={[4, 6, 1]} />
            <Lightformer form="rect" intensity={1.2} position={[6, 3, 4]} scale={[4, 6, 1]} />
          </Environment>
        )}
        <Suspense fallback={null}>
          <Shelter3D design={design} thermal={thermal} section={section} shadows={shadows && quality === 'high'} />
        </Suspense>
        <group rotation-y={(180 - geo.design.orientation) * DEG}>{showDims && <Dimensions geo={geo} />}</group>
        {showCompass && <Compass radius={compassR} />}
        <mesh rotation-x={-Math.PI / 2} position-y={-0.004} receiveShadow>
          <planeGeometry args={[90, 90]} />
          <shadowMaterial opacity={0.24} />
        </mesh>
        {showGrid && (
          <Grid
            position={[0, -0.006, 0]} args={[40, 40]} cellSize={1} cellThickness={0.7} cellColor="#c3d1e6"
            sectionSize={5} sectionThickness={1.2} sectionColor="#8aa9dd" fadeDistance={46} fadeStrength={1.6} infiniteGrid
          />
        )}
        <OrbitControls
          makeDefault enableDamping dampingFactor={0.09} target={target} minDistance={3} maxDistance={48}
          maxPolarAngle={Math.PI / 2 - 0.02} autoRotate={autoRotate} autoRotateSpeed={0.9} enabled={interactive}
        />
        <CameraRig preset={cameraPreset} nonce={presetNonce} radius={radius} bearing={geo.design.orientation} target={target} />
        {syncId && <CameraSync id={syncId} />}
        {onCapture && <SnapshotCapture onCapture={onCapture} />}
        {scene}
      </Canvas>
      <div className="crop-b pointer-events-none absolute inset-0" />
      {caption && (
        <div className="num pointer-events-none absolute left-7 top-6 z-10 text-[10px] font-medium uppercase tracking-[0.12em] text-brand-700/80">
          {caption}
        </div>
      )}
      {children}
    </div>
  )
}
