import { useEffect, useMemo } from 'react'
import type { DerivedGeometry } from '../../types/shelter'
import { Door } from './Door'
import { Floor } from './Floor'
import { Roof } from './Roof'
import { Walls } from './Walls'
import { Windows } from './Windows'
import { buildRectangular, disposeBuild } from './generators'

export function RectangularShelter({ geo }: { geo: DerivedGeometry }) {
  const build = useMemo(() => buildRectangular(geo), [geo])
  useEffect(() => () => disposeBuild(build), [build])
  return (
    <group>
      <Floor parts={build.parts} />
      <Walls parts={build.parts} />
      <Roof parts={build.parts} />
      <Windows placements={geo.windows} />
      <Door placement={geo.door} />
    </group>
  )
}
