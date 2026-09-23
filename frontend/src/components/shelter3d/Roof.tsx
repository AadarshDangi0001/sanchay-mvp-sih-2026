import type { Part } from './generators'
import { PartMesh } from './Walls'

export function Roof({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.filter((p) => p.component === 'roof').map((p) => (
        <PartMesh key={p.key} part={p} kind="roof" />
      ))}
    </>
  )
}
