import { useState, type ReactNode } from 'react'
import { Grid3x3, Ruler, RotateCw, Scissors, Sun } from 'lucide-react'
import { useProjectStore } from '../../store/useProjectStore'
import type { ShelterDesign } from '../../types/shelter'
import { clock } from '../../utils/format'
import { ShelterViewer } from '../shelter3d/ShelterViewer'
import type { CameraPreset } from '../shelter3d/SceneExtras'
import type { ThermalView } from '../shelter3d/ThermalHeatmap'
import { sunPosition } from '../../utils/thermal'

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'iso', label: 'Iso' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
]

const pill = 'rounded-xl border border-line bg-white/90 shadow-card backdrop-blur'

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-pressed={on}
      className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${on ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700'}`}
    >
      {icon}
      <span className="hidden 2xl:inline">{label}</span>
    </button>
  )
}

interface StageProps {
  design: ShelterDesign
  thermal?: ThermalView
  className?: string
  caption?: ReactNode
  syncId?: string
  /** hide the bottom control bar (thumbnails, compact viewers) */
  compact?: boolean
  /** locked hour (e.g. driven by results scrubber) */
  hourOverride?: number
  overlay?: ReactNode
  defaults?: { dims?: boolean; sunPath?: boolean; rotate?: boolean }
  scene?: ReactNode
}

/** The full-featured 3D viewer used across pages: presets, time-of-day sun, grid/dimension/section toggles. */
export function ShelterStage({ design, thermal, className = '', caption, syncId, compact, hourOverride, overlay, defaults, scene }: StageProps) {
  const weather = useProjectStore((s) => s.weather)
  const [hour, setHour] = useState(13)
  const [grid, setGrid] = useState(true)
  const [dims, setDims] = useState(defaults?.dims ?? true)
  const [sunPath, setSunPath] = useState(defaults?.sunPath ?? true)
  const [section, setSection] = useState(false)
  const [rotate, setRotate] = useState(defaults?.rotate ?? false)
  const [preset, setPreset] = useState<CameraPreset | null>(null)
  const [nonce, setNonce] = useState(0)

  const h = hourOverride ?? hour
  const sun = sunPosition(weather.latitude, weather.dayOfYear, h)

  return (
    <ShelterViewer
      design={design}
      thermal={thermal}
      hour={h}
      latitude={weather.latitude}
      dayOfYear={weather.dayOfYear}
      showGrid={grid}
      showDims={dims}
      showSunPath={sunPath}
      autoRotate={rotate}
      section={section ? 0.25 : null}
      cameraPreset={preset}
      presetNonce={nonce}
      syncId={syncId}
      className={className}
      caption={caption}
      scene={scene}
    >
      <div className="absolute right-4 top-4 z-10 flex gap-1.5">
        <div className={`${pill} flex p-1`}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPreset(p.id); setNonce((n) => n + 1); setRotate(false) }}
              className="rounded-lg px-2.5 py-1 text-xs font-bold text-ink-soft transition hover:bg-brand-50 hover:text-brand-700"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {overlay}
      {!compact && (
        <div className="absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-end justify-between gap-2">
          <div className={`${pill} flex items-center gap-3 px-3.5 py-2`}>
            <Sun size={16} className={sun.altitude > 0 ? 'text-amber-500' : 'text-slate-400'} />
            <input
              type="range" className="slider w-32 sm:w-44" min={5} max={19} step={0.25} value={h} disabled={hourOverride !== undefined}
              onChange={(e) => setHour(parseFloat(e.target.value))}
              style={{ ['--fill' as string]: `${((h - 5) / 14) * 100}%` }} aria-label="Time of day"
            />
            <div className="num w-[86px] text-xs font-semibold leading-tight text-ink-soft">
              <div className="text-sm font-bold text-ink">{clock(h)}</div>
              {sun.altitude > 0 ? `alt ${(sun.altitude / (Math.PI / 180)).toFixed(0)}°` : 'below horizon'}
            </div>
          </div>
          <div className={`${pill} flex gap-0.5 p-1`}>
            <Toggle on={grid} onClick={() => setGrid(!grid)} icon={<Grid3x3 size={14} />} label="Grid" />
            <Toggle on={dims} onClick={() => setDims(!dims)} icon={<Ruler size={14} />} label="Dims" />
            <Toggle on={sunPath} onClick={() => setSunPath(!sunPath)} icon={<Sun size={14} />} label="Sun path" />
            <Toggle on={section} onClick={() => setSection(!section)} icon={<Scissors size={14} />} label="Section" />
            <Toggle on={rotate} onClick={() => setRotate(!rotate)} icon={<RotateCw size={14} />} label="Spin" />
          </div>
        </div>
      )}
    </ShelterViewer>
  )
}
