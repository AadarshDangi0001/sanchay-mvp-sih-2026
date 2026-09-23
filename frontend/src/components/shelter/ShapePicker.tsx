import type { ShelterType } from '../../types/shelter'
import { SHELTER_TYPES } from '../../utils/geometry'

export function ShapeGlyph({ type, className = '' }: { type: ShelterType; className?: string }) {
  const stroke = 'currentColor'
  return (
    <svg viewBox="0 0 64 44" className={className} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 40h56" opacity="0.4" />
      {type === 'rectangular' && (
        <>
          <path d="M12 40V18h40v22" />
          <path d="M9 18h46" />
          <rect x="20" y="24" width="9" height="7" stroke="var(--color-aqua-500)" />
          <rect x="41" y="27" width="6" height="13" />
        </>
      )}
      {type === 'aframe' && (
        <>
          <path d="M10 40 32 6l22 34" />
          <path d="M18 40 32 17l14 23" opacity="0.5" />
          <rect x="27" y="24" width="10" height="8" stroke="var(--color-aqua-500)" />
        </>
      )}
      {type === 'dome' && (
        <>
          <path d="M8 40a24 28 0 0 1 48 0" />
          <path d="M14 24h36M22 12h20" opacity="0.4" />
          <rect x="26" y="26" width="10" height="7" stroke="var(--color-aqua-500)" />
        </>
      )}
    </svg>
  )
}

export function ShapePicker({ value, onChange }: { value: ShelterType; onChange: (t: ShelterType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Shelter type">
      {SHELTER_TYPES.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.id)}
            className={`group rounded-xl border p-2.5 text-left transition ${
              active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-line bg-white hover:border-brand-300'
            }`}
          >
            <ShapeGlyph type={t.id} className={`mb-2 h-10 w-full ${active ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`} />
            <div className={`text-[13px] font-bold leading-tight ${active ? 'text-brand-700' : 'text-ink'}`}>{t.label}</div>
          </button>
        )
      })}
    </div>
  )
}
