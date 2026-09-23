import { createContext, useContext } from 'react'
import type * as THREE from 'three'
import type { Paint } from './ThermalHeatmap'

export interface ShelterCtx {
  paint: Paint
  clip: THREE.Plane[] | null
  shadows: boolean
}

export const ShelterContext = createContext<ShelterCtx | null>(null)

export function useShelter(): ShelterCtx {
  const ctx = useContext(ShelterContext)
  if (!ctx) throw new Error('Shelter parts must render inside <Shelter3D>')
  return ctx
}
