import type { ReactNode } from 'react'
import { Term } from './Term'

export function Stat({
  label, value, unit, icon, term, delta, tone = 'brand', hint,
}: {
  label: string
  value: ReactNode
  unit?: string
  icon?: ReactNode
  term?: string
  delta?: ReactNode
  tone?: 'brand' | 'aqua' | 'amber' | 'red' | 'green'
  hint?: string
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    aqua: 'bg-aqua-50 text-aqua-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-mute">{term ? <Term k={term}>{label}</Term> : label}</span>
        {icon && <span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-[28px] font-bold leading-none tracking-tight">{value}</span>
        {unit && <span className="text-sm font-semibold text-ink-mute">{unit}</span>}
      </div>
      {(delta || hint) && <div className="mt-2 text-xs font-semibold text-ink-mute">{delta ?? hint}</div>}
    </div>
  )
}
