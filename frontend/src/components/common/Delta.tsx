import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

/** Change vs a baseline, coloured by whether it is an improvement. */
export function Delta({ value, base, better, digits = 1, unit = '' }: { value: number; base: number; better: 'high' | 'low'; digits?: number; unit?: string }) {
  const d = value - base
  if (Math.abs(d) < Math.pow(10, -digits) / 2) return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-ink-mute"><Minus size={11} /> no change</span>
  const good = better === 'high' ? d > 0 : d < 0
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`num inline-flex items-center gap-0.5 text-[11px] font-bold ${good ? 'text-emerald-600' : 'text-red-600'}`}>
      <Icon size={12} strokeWidth={3} />
      {d > 0 ? '+' : '−'}{Math.abs(d).toFixed(digits)}{unit}
    </span>
  )
}
