import type { Part } from './generators'
import { PartMesh } from './Walls'

/** Floor slab plus the thermal-mass layer on top of it. */
export function Floor({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.filter((p) => p.component === 'floor' || p.component === 'mass').map((p) => (
        <PartMesh key={p.key} part={p} kind={p.component === 'mass' ? 'mass' : 'floor'} />
      ))}
    </>
  )
}
