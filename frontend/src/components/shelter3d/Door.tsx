import { useMemo } from 'react'
import * as THREE from 'three'
import type { Placement } from '../../types/shelter'
import { useShelter } from './ShelterContext'
import { quatFromNormal } from './generators'

export function Door({ placement, dome = false }: { placement: Placement; dome?: boolean }) {
  const { paint, clip, shadows } = useShelter()
  const m = paint.mat('door')
  const quat = useMemo(() => quatFromNormal(placement.normal), [placement.normal])
  const { width: w, height: h } = placement
  const off = dome ? 0.06 : -0.03
  return (
    <group
      position={[
        placement.position[0] + placement.normal[0] * off,
        placement.position[1] + placement.normal[1] * off,
        placement.position[2] + placement.normal[2] * off,
      ]}
      quaternion={quat}
    >
      <mesh castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[w, h, 0.07]} />
        <meshStandardMaterial
          color={m.color} roughness={m.roughness} metalness={m.metalness} emissive={m.emissive ?? '#000'}
          emissiveIntensity={m.emissiveIntensity ?? 0} clippingPlanes={clip ?? undefined} side={THREE.DoubleSide}
        />
      </mesh>
      {/* panelled inset + handle */}
      <mesh position={[0, 0.1, 0.037]}>
        <boxGeometry args={[w * 0.68, h * 0.62, 0.012]} />
        <meshStandardMaterial color={paint.mode === 'normal' ? '#764a28' : m.color} roughness={0.8} clippingPlanes={clip ?? undefined} />
      </mesh>
      <mesh position={[w * 0.36, -0.05, 0.06]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshStandardMaterial color="#d7dde6" metalness={0.9} roughness={0.25} clippingPlanes={clip ?? undefined} />
      </mesh>
    </group>
  )
}
