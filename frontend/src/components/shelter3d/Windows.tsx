import { useMemo } from 'react'
import * as THREE from 'three'
import type { Placement } from '../../types/shelter'
import { useShelter } from './ShelterContext'
import { quatFromNormal } from './generators'

const FRAME = 0.06

export function Windows({ placements, dome = false }: { placements: Placement[]; dome?: boolean }) {
  const { paint, clip } = useShelter()
  const glass = paint.mat('window')
  const frame = paint.mode === 'normal' ? '#e9eef5' : glass.color
  return (
    <>
      {placements.map((p) => (
        <WindowUnit key={p.id} p={p} dome={dome} glass={glass} frameColor={frame} clip={clip} />
      ))}
    </>
  )
}

function WindowUnit({
  p, dome, glass, frameColor, clip,
}: {
  p: Placement
  dome: boolean
  glass: ReturnType<ReturnType<typeof useShelter>['paint']['mat']>
  frameColor: string
  clip: THREE.Plane[] | null
}) {
  const quat = useMemo(() => quatFromNormal(p.normal), [p.normal])
  const pos = useMemo<[number, number, number]>(
    () => [
      p.position[0] + p.normal[0] * (dome ? 0.03 : 0),
      p.position[1] + p.normal[1] * (dome ? 0.03 : 0),
      p.position[2] + p.normal[2] * (dome ? 0.03 : 0),
    ],
    [p, dome],
  )
  const { width: w, height: h } = p
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={glass.color} roughness={glass.roughness} metalness={glass.metalness} transparent={glass.transparent}
          opacity={glass.opacity} emissive={glass.emissive ?? '#000'} emissiveIntensity={glass.emissiveIntensity ?? 0}
          side={THREE.DoubleSide} depthWrite={!glass.transparent} clippingPlanes={clip ?? undefined}
        />
      </mesh>
      {(
        [
          [0, h / 2, w + FRAME * 2, FRAME],
          [0, -h / 2, w + FRAME * 2, FRAME],
          [-w / 2, 0, FRAME, h],
          [w / 2, 0, FRAME, h],
        ] as [number, number, number, number][]
      ).map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0]} castShadow>
          <boxGeometry args={[bw, bh, 0.09]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.15} clippingPlanes={clip ?? undefined} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[FRAME * 0.6, h, 0.02]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} clippingPlanes={clip ?? undefined} />
      </mesh>
    </group>
  )
}
