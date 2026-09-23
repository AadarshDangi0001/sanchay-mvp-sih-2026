import { useMemo } from 'react'
import * as THREE from 'three'
import { useShelter } from './ShelterContext'
import type { Part } from './generators'
import type { PaintKind } from './ThermalHeatmap'

/** One procedural panel. Shared by Walls, Roof and Floor so all surfaces are painted the same way. */
export function PartMesh({ part, kind }: { part: Part; kind: PaintKind }) {
  const { paint, clip, shadows } = useShelter()
  const m = paint.mat(kind)
  const usesVertex = !!paint.vertex && (kind === 'wall' || kind === 'roof')
  useMemo(() => {
    if (usesVertex) paint.vertex!(part.geometry, part)
  }, [paint, part, usesVertex])
  const rotation = useMemo(() => new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2], part.order), [part])

  return (
    <mesh geometry={part.geometry} position={part.position} rotation={rotation} castShadow={shadows} receiveShadow={shadows}>
      <meshStandardMaterial
        key={usesVertex ? 'vertex' : 'plain'}
        color={m.color}
        roughness={m.roughness}
        metalness={m.metalness}
        emissive={m.emissive ?? '#000000'}
        emissiveIntensity={m.emissiveIntensity ?? 0}
        vertexColors={usesVertex}
        transparent={m.transparent}
        opacity={m.opacity}
        clippingPlanes={clip ?? undefined}
        side={clip || part.key.startsWith('dome') ? THREE.DoubleSide : THREE.FrontSide}
        clipShadows
      />
    </mesh>
  )
}

export function Walls({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.filter((p) => p.component === 'wall').map((p) => (
        <PartMesh key={p.key} part={p} kind="wall" />
      ))}
    </>
  )
}
