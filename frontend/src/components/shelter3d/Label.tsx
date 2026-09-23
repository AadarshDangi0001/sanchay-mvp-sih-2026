import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Vec3 } from '../../types/shelter'

interface LabelProps {
  text: string
  position: Vec3
  color?: string
  bg?: string
  border?: string
  /** on-screen height in CSS px */
  height?: number
  bold?: boolean
}

/** Constant-screen-size text label drawn to a canvas texture (no DOM, no network font). */
export function Label3D({ text, position, color = '#1a44b0', bg, border, height = 20, bold }: LabelProps) {
  const viewH = useThree((s) => s.size.height)
  const { texture, aspect } = useMemo(() => {
    const scale = 3
    const font = `${bold ? 700 : 600} ${height * 0.62 * scale}px "JetBrains Mono", ui-monospace, monospace`
    const probe = document.createElement('canvas').getContext('2d')!
    probe.font = font
    const pad = height * 0.4 * scale
    const w = Math.ceil(probe.measureText(text).width + pad * 2)
    const h = Math.ceil(height * scale)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    if (bg) {
      g.fillStyle = bg
      g.beginPath()
      g.roundRect(1, 1, w - 2, h - 2, h * 0.28)
      g.fill()
      if (border) {
        g.strokeStyle = border
        g.lineWidth = 2
        g.stroke()
      }
    }
    g.font = font
    g.fillStyle = color
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + h * 0.04)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { texture: tex, aspect: w / h }
  }, [text, color, bg, border, height, bold])
  useEffect(() => () => texture.dispose(), [texture])

  const sy = height / viewH
  return (
    <sprite position={position} scale={[sy * aspect, sy, 1]} renderOrder={20}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} transparent toneMapped={false} />
    </sprite>
  )
}
