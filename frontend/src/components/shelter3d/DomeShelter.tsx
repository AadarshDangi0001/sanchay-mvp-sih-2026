import { useEffect, useMemo } from 'react'
import type { DerivedGeometry } from '../../types/shelter'
import { Door } from './Door'
import { Floor } from './Floor'
import { Roof } from './Roof'
import { Walls } from './Walls'
import { Windows } from './Windows'
import { buildDome, disposeBuild } from './generators'

export function DomeShelter({ geo }: { geo: DerivedGeometry }) {
  const build = useMemo(() => buildDome(geo), [geo])
  useEffect(() => () => disposeBuild(build), [build])
  return (
    <group>
      <Floor parts={build.parts} />
      <Walls parts={build.parts} />
      <Roof parts={build.parts} />
      <Windows placements={geo.windows} dome />
      <Door placement={geo.door} dome />
    </group>
  )
}
