import { useMemo } from 'react'
import * as THREE from 'three'
import type { ShelterDesign } from '../../types/shelter'
import { DEG, deriveGeometry } from '../../utils/geometry'
import { AFrameShelter } from './AFrameShelter'
import { DomeShelter } from './DomeShelter'
import { HeatFlow } from './HeatFlow'
import { RectangularShelter } from './RectangularShelter'
import { ShelterContext } from './ShelterContext'
import { makePaint, type ThermalView } from './ThermalHeatmap'

export interface Shelter3DProps {
  design: ShelterDesign
  thermal?: ThermalView
  /** world-space z position of a section plane; everything beyond it is cut away */
  section?: number | null
  shadows?: boolean
}

/** The parametric shelter. One design object in → procedural geometry out. */
export function Shelter3D({ design, thermal, section = null, shadows = true }: Shelter3DProps) {
  const geo = useMemo(() => deriveGeometry(design), [design])
  const paint = useMemo(() => makePaint(geo.design, thermal), [geo.design, thermal])
  const clip = useMemo(() => (section === null ? null : [new THREE.Plane(new THREE.Vector3(0, 0, -1), section)]), [section])
  const ctx = useMemo(() => ({ paint, clip, shadows }), [paint, clip, shadows])

  return (
    <ShelterContext.Provider value={ctx}>
      <group rotation-y={(180 - geo.design.orientation) * DEG}>
        {geo.design.type === 'rectangular' && <RectangularShelter geo={geo} />}
        {geo.design.type === 'aframe' && <AFrameShelter geo={geo} />}
        {geo.design.type === 'dome' && <DomeShelter geo={geo} />}
        {thermal?.mode === 'heatloss' && (
          <HeatFlow geo={geo} row={thermal.result.hourly[Math.min(thermal.hourIndex, thermal.result.hourly.length - 1)]} />
        )}
      </group>
    </ShelterContext.Provider>
  )
}
